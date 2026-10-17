const { encode } = require("@msgpack/msgpack");
const {
  DEFAULT_TTS_SPEED,
  clampTtsSpeed,
  resolveCatalogTtsSpeed,
} = require("./voice-catalog");
const { estimateWavDurationSec } = require("./wav-duration");
const {
  VOICE_CLONE_MIN_SAMPLE_SEC,
  isVoiceCloneSampleLongEnough,
} = require("./voice-clone-limits");

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

/** Clone personnel (micro Mode B) — équilibre stabilité / grain. */
const CLONE_FIDELITY_TTS = {
  latency: "normal",
  normalize: false,
  temperature: 0.56,
  top_p: 0.78,
  repetition_penalty: 1.04,
  condition_on_previous_chunks: false,
  mp3_bitrate: 256,
  chunk_length: 300,
  min_chunk_length: 100,
  prosody: {
    speed: 1,
    volume: 0,
    normalize_loudness: false,
  },
  features: [],
};

/** Mode C inline — interviews / timbre marqué (Jul…) : moins de lissage Fish. */
const CLONE_INLINE_IDENTITY_TTS = {
  ...CLONE_FIDELITY_TTS,
  temperature: 0.54,
  top_p: 0.76,
  repetition_penalty: 1.04,
  chunk_length: 320,
  min_chunk_length: 120,
  prosody: {
    speed: 0.99,
    volume: 0,
    normalize_loudness: false,
  },
};

/** Mode C inline — voix lourdes / interviews : moins de lissage Fish, coffre préservé. */
const CLONE_DEEP_CHEST_TTS = {
  ...CLONE_FIDELITY_TTS,
  temperature: 0.36,
  top_p: 0.64,
  repetition_penalty: 1.0,
  prosody: {
    speed: 0.92,
    volume: 0,
    normalize_loudness: false,
  },
};

/** Mode C — voix incisives / trap (Niska…) : attaque et relief préservés. */
const CLONE_INCISIVE_TTS = {
  ...CLONE_FIDELITY_TTS,
  temperature: 0.69,
  top_p: 0.86,
  repetition_penalty: 1.08,
  chunk_length: 340,
  min_chunk_length: 120,
  prosody: {
    speed: 1.03,
    volume: 0,
    normalize_loudness: false,
  },
};

/**
 * Phrases ≤ 200 car. → un seul bloc (min_chunk=100), débit légèrement vivant.
 * Plus long → chunks liés pour garder la cohérence.
 */
function resolveTtsSpeed(text, speedOverride) {
  if (typeof speedOverride === "number" && Number.isFinite(speedOverride)) {
    return clampTtsSpeed(speedOverride);
  }

  const len = String(text || "").trim().length;
  return len <= 200 ? DEFAULT_TTS_SPEED : 1;
}

function buildTtsOptions(text, options = {}) {
  const len = String(text || "").trim().length;
  const speed = resolveTtsSpeed(text, options.speed);
  const cloneFidelity = options.cloneFidelity === true;
  const deepChestClone = options.deepChestClone === true && cloneFidelity;
  const incisiveClone = options.incisiveClone === true && cloneFidelity && !deepChestClone;
  const inlineIdentityClone =
    options.inlineIdentityClone === true &&
    cloneFidelity &&
    !deepChestClone &&
    !incisiveClone;
  const catalogFastFlow = options.catalogFastFlow === true && !cloneFidelity;

  if (cloneFidelity) {
    const base = deepChestClone
      ? CLONE_DEEP_CHEST_TTS
      : incisiveClone
        ? CLONE_INCISIVE_TTS
        : inlineIdentityClone
          ? CLONE_INLINE_IDENTITY_TTS
          : CLONE_FIDELITY_TTS;
    let speedCap = deepChestClone
      ? 0.92
      : incisiveClone
        ? 1.06
        : inlineIdentityClone
          ? 0.99
          : 1.02;
    if (incisiveClone && options.incisiveRap === true) {
      speedCap = Math.min(1.1, speedCap + 0.04);
    }
    const resolvedSpeed =
      typeof speed === "number" && Number.isFinite(speed)
        ? Math.min(clampTtsSpeed(speed), speedCap)
        : speedCap;
    const longForm = incisiveClone || inlineIdentityClone;
    const chunkLength =
      longForm && len <= 200 ? 320 : len <= 200 ? 300 : longForm ? 300 : 280;
    const minChunk =
      longForm && len <= 200 ? 120 : len <= 200 ? 100 : longForm ? 100 : 80;

    return {
      ...base,
      chunk_length: chunkLength,
      min_chunk_length: minChunk,
      condition_on_previous_chunks: len > 200,
      prosody: {
        ...base.prosody,
        speed: resolvedSpeed,
      },
    };
  }

  const resolvedCatalogSpeed =
    typeof speed === "number" && Number.isFinite(speed)
      ? clampTtsSpeed(speed)
      : DEFAULT_TTS_SPEED;

  if (options.catalogIncisiveFlow === true && !cloneFidelity) {
    const rapSpeed = Math.max(resolvedCatalogSpeed, 1.02);
    return {
      ...FIDELITY_TTS,
      temperature: 0.68,
      top_p: 0.86,
      repetition_penalty: 1.07,
      chunk_length: len <= 220 ? 340 : 300,
      min_chunk_length: 120,
      condition_on_previous_chunks: false,
      prosody: {
        speed: clampTtsSpeed(rapSpeed),
        volume: 0,
        normalize_loudness: false,
      },
    };
  }

  if (catalogFastFlow) {
    const singleTake = len <= 420;
    return {
      ...FIDELITY_TTS,
      temperature: 0.58,
      top_p: 0.76,
      repetition_penalty: 1.04,
      chunk_length: singleTake ? 360 : 300,
      min_chunk_length: singleTake ? 120 : 100,
      condition_on_previous_chunks: false,
      prosody: {
        speed: resolvedCatalogSpeed,
        volume: 0,
        normalize_loudness: false,
      },
    };
  }

  if (len <= 200) {
    return {
      ...FIDELITY_TTS,
      chunk_length: 300,
      min_chunk_length: 100,
      condition_on_previous_chunks: false,
      prosody: {
        speed: resolvedCatalogSpeed,
        volume: 0,
        normalize_loudness: false,
      },
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
    prosody: {
      speed: Math.min(resolvedCatalogSpeed, 1),
      volume: 0,
      normalize_loudness: false,
    },
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
async function transcribeAudio(audioBuffer, language = "fr", options = {}) {
  if (!audioBuffer || audioBuffer.length < 1024) {
    throw Object.assign(new Error("Échantillon audio trop court pour transcription"), {
      status: 400,
      code: "missing_audio",
    });
  }

  const form = new FormData();
  form.append("audio", new Blob([audioBuffer], { type: "audio/wav" }), "sample.wav");
  if (language) form.append("language", language);
  form.append(
    "ignore_timestamps",
    options.ignoreTimestamps === false ? "false" : "true",
  );

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
  if (options.parsePayload === true) {
    return payload;
  }

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
  speed,
  cloneFidelity,
  deepChestClone,
  inlineIdentityClone,
  incisiveClone,
  incisiveRap,
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

  const referenceDurationSec = estimateWavDurationSec(audioBuffer);
  if (
    referenceDurationSec > 0 &&
    !isVoiceCloneSampleLongEnough(referenceDurationSec)
  ) {
    throw Object.assign(
      new Error(
        `Échantillon inline trop court (${Math.round(referenceDurationSec * 10) / 10} s) — minimum ${VOICE_CLONE_MIN_SAMPLE_SEC} s pour capturer le timbre.`,
      ),
      { status: 400, code: "inline_reference_too_short" },
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
    ...buildTtsOptions(trimmed, {
      speed,
      cloneFidelity,
      deepChestClone,
      inlineIdentityClone,
      incisiveClone,
      incisiveRap,
    }),
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
  speed,
  cloneFidelity,
  catalogFastFlow,
  catalogIncisiveFlow,
  deepChestClone,
  inlineIdentityClone,
  incisiveClone,
  incisiveRap,
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

  const catalogSpeed = resolveCatalogTtsSpeed(referenceId);
  const resolvedSpeed =
    typeof speed === "number" && Number.isFinite(speed) ? speed : catalogSpeed;

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
      ...buildTtsOptions(trimmed, {
        speed: resolvedSpeed,
        cloneFidelity,
        catalogFastFlow,
        catalogIncisiveFlow,
        deepChestClone,
        inlineIdentityClone,
        incisiveClone,
        incisiveRap,
      }),
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
  CLONE_FIDELITY_TTS,
  CLONE_INLINE_IDENTITY_TTS,
  CLONE_INCISIVE_TTS,
  CLONE_DEEP_CHEST_TTS,
  synthesizeSpeech,
  synthesizeWithReferenceMsgpack,
};
