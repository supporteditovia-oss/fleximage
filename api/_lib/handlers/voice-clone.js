const { requireUser, readBody, sendError } = require("../user-auth");
const { createVoiceModel, waitForVoiceModelReady, transcribeAudio } = require("../fish-audio");
const { uploadToR2 } = require("../r2");
const { buildCloneRecord, saveVoiceCloneManifest } = require("../voice-store");

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

  try {
    const { supabase, userId } = await requireUser(req);
    const body = readBody(req);

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      res.status(400).json({ message: "Nom de voix requis", code: "missing_name" });
      return;
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
