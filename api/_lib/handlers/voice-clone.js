const { requireUser, readBody, sendError } = require("../user-auth");
const { createVoiceModel, waitForVoiceModelReady, transcribeAudio } = require("../fish-audio");
const { uploadToR2 } = require("../r2");
const { buildCloneRecord, saveVoiceCloneManifest } = require("../voice-store");
const { isUserAdmin } = require("../admin-access");
const { VOICE_CLONE_CREDIT_COST } = require("../credit-costs");
const { applyCreditDelta } = require("../generation");
const {
  getPlanUsageSnapshot,
  assertVoiceClonePlanQuota,
} = require("../plan-usage-limits");

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const { normalizeVideoDataUrlContentType } = require("../media-buffer-sniff");
const {
  extractVoiceSampleWavFromVideoBuffer,
  MAX_VOICE_VIDEO_BYTES,
} = require("../extract-audio-from-video-buffer");

async function parseVoiceSampleDataUrl(dataUrl, durationHint) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  let contentType = String(match[1] || "")
    .trim()
    .toLowerCase()
    .split(";")[0];
  let buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) return null;

  const normalizedVideoType = normalizeVideoDataUrlContentType(contentType, buffer);
  const isVideo =
    contentType.startsWith("video/") ||
    (contentType === "application/octet-stream" &&
      normalizedVideoType.startsWith("video/"));

  if (isVideo) {
    if (buffer.length > MAX_VOICE_VIDEO_BYTES) return null;
    try {
      const durationSec =
        typeof durationHint === "number" && durationHint > 0
          ? durationHint
          : 25;
      buffer = await extractVoiceSampleWavFromVideoBuffer(buffer, {
        durationSec: Math.min(25, durationSec),
      });
      contentType = "audio/wav";
    } catch {
      return null;
    }
  } else if (!contentType.startsWith("audio/")) {
    return null;
  }

  if (buffer.length === 0 || buffer.length > MAX_AUDIO_BYTES) return null;
  return { contentType, buffer };
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

  try {
    const { supabase, userId } = await requireUser(req);
    const body = readBody(req);

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      res.status(400).json({ message: "Nom de voix requis", code: "missing_name" });
      return;
    }

    const parsed = await parseVoiceSampleDataUrl(
      body.audioDataUrl,
      body.durationSec,
    );
    if (!parsed) {
      res.status(400).json({
        message:
          "Échantillon invalide — audio ou vidéo (MP4, MOV, TikTok téléchargé… max 25 Mo vidéo / 12 Mo audio).",
        code: "invalid_audio",
      });
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
      const usageSnapshot = await getPlanUsageSnapshot(supabase, userId);
      const quotaCheck = assertVoiceClonePlanQuota(usageSnapshot, "fr");
      if (!quotaCheck.ok) {
        res.status(quotaCheck.status).json({
          code: quotaCheck.code,
          message: quotaCheck.message,
          usageLimits: usageSnapshot,
        });
        return;
      }
      const credits = profile?.credits ?? 0;
      if (credits < VOICE_CLONE_CREDIT_COST) {
        res.status(403).json({
          code: "INSUFFICIENT_CREDITS",
          message: "Plus assez de jetons pour créer un clone voix.",
          creditCost: VOICE_CLONE_CREDIT_COST,
        });
        return;
      }
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

    if (!isAdmin) {
      const chargeKey = `voice-clone:${userId}:${fishVoice.id}`;
      const { error: chargeErr } = await applyCreditDelta(supabase, {
        userId,
        delta: -VOICE_CLONE_CREDIT_COST,
        reason: "voice_clone_charge",
        idempotencyKey: chargeKey,
        metadata: {
          name,
          credit_cost: VOICE_CLONE_CREDIT_COST,
          fish_reference_id: fishVoice.id,
        },
      });
      if (chargeErr) {
        console.error("voice-clone charge failed", chargeErr);
        res.status(403).json({
          code: "CREDIT_CHARGE_FAILED",
          message: "Impossible de débiter les jetons pour ce clone.",
        });
        return;
      }
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
    });
  } catch (error) {
    console.error("voice-clone error", error);
    if (error && error.message && /reference audio is not valid/i.test(error.message)) {
      error.message =
        "Échantillon vocal refusé. Réimporte 15–20 s de voix claire, sans musique.";
    }
    sendError(res, error);
  }
};
