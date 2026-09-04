const FISH_API_BASE = "https://api.fish.audio";

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

// The key may already exist in the project under an older name.
const FISH_KEY_ENV_NAMES = [
  "FISH_AUDIO_API_KEY",
  "FISH_API_KEY",
  "FISHAUDIO_API_KEY",
  "VITE_FISH_AUDIO_API_KEY",
];

function readFishApiKey() {
  for (const name of FISH_KEY_ENV_NAMES) {
    const value = cleanEnv(process.env[name]);
    if (value) return value;
  }
  return "";
}

function getFishApiKey() {
  const key = readFishApiKey();
  if (!key) {
    throw Object.assign(
      new Error(
        `Clé Fish Audio manquante. Ajoute ${FISH_KEY_ENV_NAMES[0]} dans les variables d'environnement pour activer la génération vocale.`,
      ),
      { status: 503, code: "missing_fish_api_key" },
    );
  }
  return key;
}

function hasFishApiKey() {
  return Boolean(readFishApiKey());
}

/** data URL (audio/*) -> { buffer, contentType, extension } */
function decodeAudioDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(
    /^data:([\w-]+\/[\w+.-]+);base64,([\s\S]+)$/,
  );
  if (!match) {
    throw Object.assign(new Error("Extrait audio invalide."), {
      status: 400,
      code: "invalid_audio_data_url",
    });
  }
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const subtype = (contentType.split("/")[1] || "mp3").split(";")[0];
  const extension = subtype === "mpeg" ? "mp3" : subtype;
  return { buffer, contentType, extension };
}

async function fishError(response, fallback) {
  let detail = "";
  try {
    detail = (await response.text()).slice(0, 300);
  } catch {
    /* ignore */
  }
  return Object.assign(new Error(detail ? `${fallback} (${detail})` : fallback), {
    status: response.status === 401 ? 502 : response.status,
    code: "fish_audio_error",
  });
}

/**
 * Clone a voice from a short audio excerpt.
 * Returns the Fish Audio model id, usable later as reference_id.
 */
async function cloneVoice({ name, audioDataUrl, description }) {
  const apiKey = getFishApiKey();
  const { buffer, contentType, extension } = decodeAudioDataUrl(audioDataUrl);

  const form = new FormData();
  form.append("visibility", "private");
  form.append("type", "tts");
  form.append("title", String(name || "Ma voix").slice(0, 60));
  form.append("train_mode", "fast");
  form.append("enhance_audio_quality", "true");
  if (description) form.append("description", String(description).slice(0, 200));
  form.append(
    "voices",
    new Blob([buffer], { type: contentType }),
    `sample.${extension}`,
  );

  const response = await fetch(`${FISH_API_BASE}/model`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) throw await fishError(response, "Clonage vocal impossible");

  const data = await response.json();
  const referenceId = data && (data._id || data.id);
  if (!referenceId) {
    throw Object.assign(new Error("Réponse Fish Audio inattendue."), {
      status: 502,
      code: "fish_audio_error",
    });
  }
  return { referenceId, raw: data };
}

/**
 * Text to speech with either a stored model (referenceId) or a raw excerpt
 * for zero-shot cloning (instantAudioDataUrl).
 */
async function synthesizeSpeech({
  text,
  referenceId,
  instantAudioDataUrl,
  model = "s1",
}) {
  const apiKey = getFishApiKey();

  const payload = {
    text: String(text),
    format: "mp3",
    mp3_bitrate: 128,
    normalize: true,
  };

  if (referenceId) {
    payload.reference_id = referenceId;
  } else if (instantAudioDataUrl) {
    const { buffer } = decodeAudioDataUrl(instantAudioDataUrl);
    payload.references = [{ audio: buffer.toString("base64"), text: "" }];
  } else {
    throw Object.assign(new Error("Aucune voix sélectionnée."), {
      status: 400,
      code: "missing_voice_reference",
    });
  }

  const response = await fetch(`${FISH_API_BASE}/v1/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw await fishError(response, "Génération vocale impossible");

  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length === 0) {
    throw Object.assign(new Error("Fish Audio a renvoyé un audio vide."), {
      status: 502,
      code: "fish_audio_error",
    });
  }
  return audio;
}

/** Public voice library search — works without an API key. */
async function searchPublicModels(title, pageSize = 10) {
  const url = new URL(`${FISH_API_BASE}/model`);
  url.searchParams.set("title", String(title));
  url.searchParams.set("page_size", String(pageSize));
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) throw await fishError(response, "Recherche de voix impossible");
  const data = await response.json();
  return (data.items || []).map((item) => ({
    id: item._id,
    title: item.title,
    languages: item.languages || [],
    sampleAudio: (item.samples || [{}])[0].audio || null,
  }));
}

module.exports = {
  cloneVoice,
  synthesizeSpeech,
  searchPublicModels,
  decodeAudioDataUrl,
  getFishApiKey,
  hasFishApiKey,
};
