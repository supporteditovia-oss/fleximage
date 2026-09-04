const { encode } = require("@msgpack/msgpack");

const FISH_API_BASE = "https://api.fish.audio";

const FIDELITY_TTS = {
  latency: "normal",
  normalize: false,
  temperature: 0.6,
  top_p: 0.78,
  repetition_penalty: 1.06,
  condition_on_previous_chunks: false,
  mp3_bitrate: 192,
  chunk_length: 300,
  min_chunk_length: 100,
  prosody: {
    speed: 1.02,
    volume: 0,
    normalize_loudness: false,
  },
  features: [],
};

/**
 * Phrases ≤ 200 car. → un seul bloc (min_chunk=100), débit légèrement vivant.
 * Plus long → chunks liés pour garder la cohérence.
 */
function buildTtsOptions(text) {
  const len = String(text || "").trim().length;

  if (len <= 200) {
    return {
      ...FIDELITY_TTS,
      chunk_length: 300,
      min_chunk_length: 100,
      condition_on_previous_chunks: false,
      temperature: 0.6,
      top_p: 0.78,
      repetition_penalty: 1.06,
      prosody: { speed: 1.02, volume: 0, normalize_loudness: false },
    };
  }

  return {
    ...FIDELITY_TTS,
    chunk_length: 280,
    min_chunk_length: 80,
    temperature: 0.54,
    top_p: 0.74,
    repetition_penalty: 1.1,
    condition_on_previous_chunks: true,
    prosody: { speed: 1, volume: 0, normalize_loudness: false },
  };
}

function cleanEnv(value) {
  if (value == null) return "";
  let text = String(value).trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }
  return text.replace(/^\uFEFF/, "").replace(/[\r\n\u200B-\u200D\uFEFF]/g, "");
}

function getFishConfig() {
  const apiKey = cleanEnv(process.env.FISH_AUDIO_API_KEY || process.env.FISH_API_KEY);
  if (!apiKey) {
    throw Object.assign(new Error("Configuration Fish Audio manquante"), {
      status: 500,
      code: "missing_fish_env",
    });
  }

  const model =
    cleanEnv(process.env.FISH_AUDIO_MODEL) ||
    "s2.1-pro-free";

  return { apiKey, model };
}

function fishHeaders(extra = {}) {
  const { apiKey, model } = getFishConfig();
  return {
    Authorization: `Bearer ${apiKey}`,
    model,
    ...extra,
  };
}

async function readFishError(response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    return parsed.message || parsed.reason || text || `HTTP ${response.status}`;
  } catch {
    return text || `HTTP ${response.status}`;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getVoiceModel(referenceId) {
  const response = await fetch(`${FISH_API_BASE}/model/${encodeURIComponent(referenceId)}`, {
    method: "GET",
    headers: fishHeaders(),
  });
  if (!response.ok) {
    const message = await readFishError(response);
    throw Object.assign(new Error(message || "Modèle vocal introuvable"), {
      status: response.status,
      code: "fish_model_not_found",
    });
  }
  return response.json();
}

/**
 * Attend que Fish ait fini d'entraîner le clone (fast mode — quelques secondes).
 */
async function waitForVoiceModelReady(referenceId, options = {}) {
  const timeoutMs = options.timeoutMs ?? 45000;
  const intervalMs = options.intervalMs ?? 1200;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const model = await getVoiceModel(referenceId);
    const state = String(model.state || "").toLowerCase();
    if (state === "trained") return model;
    if (state === "failed") {
      throw Object.assign(new Error("Le clonage vocal a échoué côté Fish Audio"), {
        status: 502,
        code: "fish_clone_failed",
      });
    }
    await sleep(intervalMs);
  }

  return null;
}

/**
 * Create a persistent voice model from one or more audio buffers.
 * @returns {{ id: string, state: string, title: string }}
 */
async function createVoiceModel({
  title,
  description,
  audioBuffers,
  texts,
  trainMode = "fast",
  enhanceAudioQuality = false,
}) {
  if (!audioBuffers || audioBuffers.length === 0) {
    throw Object.assign(new Error("Échantillon audio requis"), {
      status: 400,
      code: "missing_audio",
    });
  }

  const form = new FormData();
  form.append("type", "tts");
  form.append("title", title.slice(0, 80));
  if (description) form.append("description", description.slice(0, 240));
  form.append("visibility", "private");
  form.append("train_mode", trainMode);
  form.append("enhance_audio_quality", enhanceAudioQuality ? "true" : "false");

  audioBuffers.forEach((buffer, index) => {
    const blob = new Blob([buffer], { type: "audio/wav" });
    form.append("voices", blob, `sample-${index}.wav`);
  });

  if (Array.isArray(texts)) {
    texts.forEach((line) => {
      const transcript = String(line || "").trim();
      if (transcript.length >= 3) {
        form.append("texts", transcript.slice(0, 4000));
      }
    });
  }

  const response = await fetch(`${FISH_API_BASE}/model`, {
    method: "POST",
    headers: fishHeaders(),
    body: form,
  });

  if (!response.ok) {
    const message = await readFishError(response);
    throw Object.assign(new Error(message || "Échec du clonage vocal"), {
      status: response.status >= 400 && response.status < 600 ? response.status : 502,
      code: "fish_clone_failed",
    });
  }

  const payload = await response.json();
  const id = payload._id || payload.id;
  if (!id) {
    throw Object.assign(new Error("Réponse Fish Audio invalide"), {
      status: 502,
      code: "fish_invalid_response",
    });
  }

  return {
    id: String(id),
    state: String(payload.state || "trained"),
    title: String(payload.title || title),
  };
}

/**
 * Transcrit un échantillon vocal (requis pour le zero-shot inline).
 */
async function transcribeAudio(audioBuffer, language = "fr") {
  if (!audioBuffer || audioBuffer.length < 1024) {
    throw Object.assign(new Error("Échantillon audio trop court pour transcription"), {
      status: 400,
      code: "missing_audio",
    });
  }

  const form = new FormData();
  form.append("audio", new Blob([audioBuffer], { type: "audio/wav" }), "sample.wav");
  if (language) form.append("language", language);
  form.append("ignore_timestamps", "true");

  const response = await fetch(`${FISH_API_BASE}/v1/asr`, {
    method: "POST",
    headers: fishHeaders(),
    body: form,
  });

  if (!response.ok) {
    const message = await readFishError(response);
    throw Object.assign(new Error(message || "Échec transcription audio"), {
      status: response.status >= 400 && response.status < 600 ? response.status : 502,
      code: "fish_asr_failed",
    });
  }

  const payload = await response.json();
  const transcript = String(payload.text || "").trim();
  if (transcript.length < 3) {
    throw Object.assign(
      new Error("Transcription vide. Utilise un extrait avec de la voix claire."),
      { status: 400, code: "empty_transcript" },
    );
  }

  return transcript.slice(0, 4000);
}

/**
 * Zero-shot TTS with inline reference audio (MessagePack).
 * referenceText doit correspondre à ce qui est dit dans l'échantillon.
 */
async function synthesizeWithReferenceMsgpack({
  text,
  audioBuffer,
  referenceText,
}) {
  const trimmed = String(text || "").trim();
  const transcript = String(referenceText || "").trim();
  if (!trimmed || !audioBuffer || audioBuffer.length < 1024) {
    throw Object.assign(new Error("Texte et audio requis"), {
      status: 400,
      code: "missing_input",
    });
  }
  if (transcript.length < 3) {
    throw Object.assign(
      new Error("Transcription de l'échantillon requise pour la synthèse inline"),
      { status: 400, code: "missing_reference_text" },
    );
  }

  const payload = {
    text: trimmed.slice(0, 2000),
    references: [
      {
        audio: new Uint8Array(audioBuffer),
        text: transcript.slice(0, 4000),
      },
    ],
    format: "mp3",
    ...buildTtsOptions(trimmed),
  };

  const body = encode(payload);

  const response = await fetch(`${FISH_API_BASE}/v1/tts`, {
    method: "POST",
    headers: fishHeaders({
      "Content-Type": "application/msgpack",
      Accept: "audio/mpeg",
    }),
    body: Buffer.from(body),
  });

  if (!response.ok) {
    const message = await readFishError(response);
    throw Object.assign(new Error(message || "Échec de la synthèse vocale"), {
      status: response.status >= 400 && response.status < 600 ? response.status : 502,
      code: "fish_tts_failed",
    });
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Synthesize speech from text using a cloned voice reference id.
 * @returns {Promise<Buffer>}
 */
async function synthesizeSpeech({
  text,
  referenceId,
  format = "mp3",
}) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    throw Object.assign(new Error("Texte requis"), {
      status: 400,
      code: "missing_text",
    });
  }
  if (!referenceId) {
    throw Object.assign(new Error("Voix de référence requise"), {
      status: 400,
      code: "missing_reference",
    });
  }

  const response = await fetch(`${FISH_API_BASE}/v1/tts`, {
    method: "POST",
    headers: fishHeaders({
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    }),
    body: JSON.stringify({
      text: trimmed.slice(0, 2000),
      reference_id: referenceId,
      format,
      ...buildTtsOptions(trimmed),
    }),
  });

  if (!response.ok) {
    const message = await readFishError(response);
    throw Object.assign(new Error(message || "Échec de la synthèse vocale"), {
      status: response.status >= 400 && response.status < 600 ? response.status : 502,
      code: "fish_tts_failed",
    });
  }

  return Buffer.from(await response.arrayBuffer());
}

module.exports = {
  getFishConfig,
  getVoiceModel,
  waitForVoiceModelReady,
  createVoiceModel,
  transcribeAudio,
  buildTtsOptions,
  synthesizeSpeech,
  synthesizeWithReferenceMsgpack,
};
