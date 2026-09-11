const { randomUUID } = require("crypto");
const { requireUser, readBody, sendError } = require("../user-auth");
const { isUserAdmin } = require("../admin-access");
const { createVoiceModel, waitForVoiceModelReady, transcribeAudio } = require("../fish-audio");
const { uploadToR2 } = require("../r2");
const { buildCloneRecord, saveVoiceCloneManifest } = require("../voice-store");
const { applyCreditDelta } = require("../generation");
const {
  VOICE_CLONE_CREDIT_COST,
  MAX_VOICE_CLONES_PER_USER,
} = require("../voice-pricing");

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0 || buffer.length > MAX_AUDIO_BYTES) return null;
  return { contentType: match[1], buffer };
}

async function persistClone(supabase, userId, payload) {
  const { data, error } = await supabase
    .from("voice_clones")
    .insert(payload)
    .select(
      "id, name, fish_reference_id, fish_state, source_type, source_label, duration_sec, created_at",
    )
    .single();

  if (!error) return data;

  const missingTable =
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /voice_clones/i.test(String(error.message || ""));

  if (!missingTable) throw error;

  const row = buildCloneRecord({
    userId,
    name: payload.name,
    fishReferenceId: payload.fish_reference_id,
    fishState: payload.fish_state,
    sourceType: payload.source_type,
    sourceLabel: payload.source_label,
    durationSec: payload.duration_sec,
    sampleKey: payload.sample_r2_key,
    sampleUrl: payload.metadata?.sample_url,
    referenceTranscript: payload.metadata?.reference_transcript,
  });

  await saveVoiceCloneManifest(userId, row);
  return row;
}

module.exports = async function voiceCloneHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  let supabase;
  let userId;
  let cloneRequestId = randomUUID();
  let creditCost = 0;
  let charged = false;

  try {
    ({ supabase, userId } = await requireUser(req));
    const body = readBody(req);

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      res.status(400).json({ message: "Nom de voix requis", code: "missing_name" });
      return;
    }

    const admin = await isUserAdmin(supabase, userId);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, credits")
      .eq("id", userId)
      .single();
    const isAdmin = admin || profile?.role === "admin";

    if (!isAdmin) {
      const { count, error: countErr } = await supabase
        .from("voice_clones")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (countErr && countErr.code !== "42P01" && countErr.code !== "PGRST205") {
        throw countErr;
      }
      const cloneCount = Number(count) || 0;
      if (cloneCount >= MAX_VOICE_CLONES_PER_USER) {
        res.status(403).json({
          code: "VOICE_CLONE_LIMIT",
          message: `Limite de ${MAX_VOICE_CLONES_PER_USER} clones vocaux atteinte.`,
        });
        return;
      }

      creditCost = VOICE_CLONE_CREDIT_COST;
      if ((profile?.credits ?? 0) < creditCost) {
        res.status(402).json({
          code: "insufficient_credits",
          message: `Plus assez de jetons (${creditCost} cr. requis pour cloner une voix).`,
        });
        return;
      }
    }

    const parsed = parseDataUrl(body.audioDataUrl);
    if (!parsed) {
      res.status(400).json({
        message: "Échantillon audio invalide (max 12 Mo)",
        code: "invalid_audio",
      });
      return;
    }

    const sourceType =
      body.sourceType === "record" || body.sourceType === "catalog"
        ? body.sourceType
        : "import";
    const sourceLabel =
      typeof body.sourceLabel === "string" ? body.sourceLabel.trim().slice(0, 120) : null;
    const durationSec =
      typeof body.durationSec === "number" && body.durationSec > 0
        ? body.durationSec
        : null;

    const sampleKey = `voice-samples/${userId}/${Date.now()}.wav`;
    const sampleUrl = await uploadToR2(sampleKey, parsed.buffer, parsed.contentType);

    if (creditCost > 0) {
      const { error: chargeErr } = await applyCreditDelta(supabase, {
        userId,
        delta: -creditCost,
        reason: "generation_charge",
        generationId: null,
        idempotencyKey: `voice-clone:${cloneRequestId}:charge`,
        metadata: { type: "voice_clone", clone_request_id: cloneRequestId },
      });
      if (chargeErr) {
        res.status(500).json({ message: "Échec du débit des jetons" });
        return;
      }
      charged = true;
    }

    let referenceTranscript = null;
    try {
      referenceTranscript = await transcribeAudio(parsed.buffer, "fr");
    } catch (asrErr) {
      const lowCredit =
        asrErr?.status === 402 || /insufficient api credit/i.test(String(asrErr?.message || ""));
      console.warn(
        lowCredit
          ? "voice-clone transcript skipped (API credit) — Fish ASR à l'import"
          : "voice-clone transcript skipped",
        asrErr?.message || asrErr,
      );
    }

    const fishVoice = await createVoiceModel({
      title: `LuxeFlexIA — ${name}`.slice(0, 80),
      description: `Clone user ${userId}`,
      audioBuffers: [parsed.buffer],
      texts: referenceTranscript ? [referenceTranscript] : undefined,
      trainMode: "fast",
      enhanceAudioQuality: false,
    });

    try {
      await waitForVoiceModelReady(fishVoice.id, { timeoutMs: 45000 });
    } catch (waitErr) {
      console.warn("voice-clone model wait", waitErr);
    }

    const row = await persistClone(supabase, userId, {
      user_id: userId,
      name,
      fish_reference_id: fishVoice.id,
      fish_state: fishVoice.state,
      source_type: sourceType,
      source_label: sourceLabel,
      duration_sec: durationSec,
      sample_r2_key: sampleKey,
      metadata: {
        sample_url: sampleUrl,
        reference_transcript: referenceTranscript,
      },
    });

    res.status(201).json({
      clone: row,
      fishReferenceId: fishVoice.id,
      creditCost,
    });
  } catch (error) {
    console.error("voice-clone error", error);
    if (charged && supabase && userId && creditCost > 0) {
      try {
        await applyCreditDelta(supabase, {
          userId,
          delta: creditCost,
          reason: "refund",
          generationId: null,
          idempotencyKey: `voice-clone:${cloneRequestId}:refund`,
          metadata: { type: "voice_clone_refund", clone_request_id: cloneRequestId },
        });
      } catch (refundErr) {
        console.error("voice-clone refund failed", refundErr);
      }
    }
    if (error && error.message && /reference audio is not valid/i.test(error.message)) {
      error.message =
        "Échantillon vocal refusé. Réimporte 15–20 s de voix claire, sans musique.";
    }
    sendError(res, error);
  }
};
