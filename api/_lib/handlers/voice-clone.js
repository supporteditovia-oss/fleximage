const { randomUUID } = require("crypto");
const { requireUser, readBody, sendError } = require("../user-auth");
const { isUserAdmin } = require("../admin-access");
const { createVoiceModel, waitForVoiceModelReady, transcribeAudio } = require("../fish-audio");
const { applyCreditDelta } = require("../generation");
const { VOICE_CLONE_CREDIT_COST } = require("../voice-pricing");

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0 || buffer.length > MAX_AUDIO_BYTES) return null;
  return { contentType: match[1], buffer };
}

/** Clone éphémère — modèle Fish uniquement, rien en base ni R2. */
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
      description: `Ephemeral clone ${userId}`,
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

    const ephemeralId = randomUUID();
    const createdAt = new Date().toISOString();

    res.status(201).json({
      clone: {
        id: ephemeralId,
        name,
        fish_reference_id: fishVoice.id,
        fish_state: fishVoice.state,
        source_type: sourceType,
        source_label: sourceLabel,
        duration_sec: durationSec,
        created_at: createdAt,
        ephemeral: true,
      },
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
