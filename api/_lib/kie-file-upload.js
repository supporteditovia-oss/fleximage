const KIE_FILE_UPLOAD_BASE = "https://kieai.redpandaai.co";

function getKieApiKey() {
  return String(process.env.KIE_AI_API_KEY || "").trim();
}

function guessFileNameFromUrl(url, fallback) {
  try {
    const path = new URL(url).pathname;
    const base = path.split("/").filter(Boolean).pop();
    if (base && base.length <= 120) return base;
  } catch {
    /* ignore */
  }
  return fallback;
}

function guessMimeFromName(name) {
  const n = String(name || "").toLowerCase();
  if (n.endsWith(".mp4")) return "video/mp4";
  if (n.endsWith(".mov")) return "video/quicktime";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function uploadBufferToKie(buffer, { fileName, mimeType, uploadPath }) {
  const apiKey = getKieApiKey();
  if (!apiKey) {
    throw Object.assign(new Error("KIE_AI_API_KEY manquant"), { status: 503 });
  }

  const form = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  form.append("file", blob, fileName);
  form.append("uploadPath", uploadPath);
  form.append("fileName", fileName);

  const response = await fetch(`${KIE_FILE_UPLOAD_BASE}/api/file-stream-upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("[kie-file-upload] stream-upload réponse non-JSON", {
      status: response.status,
      bodyPreview: text.slice(0, 500),
    });
    throw new Error(`KIE upload: réponse non-JSON (${response.status})`);
  }

  const fileUrl = parsed?.data?.fileUrl;
  if (!response.ok || !parsed?.success || !fileUrl) {
    // DIAGNOSTIC (temporaire) — capture la réponse brute Kie.ai avant de la
    // remplacer par un message générique. Ne pas retirer sans avoir isolé
    // la cause : parsed.msg peut être un message de SUCCÈS Kie.ai (ex.
    // "File uploaded successfully") même quand fileUrl est absent, ce qui
    // produit un message d'erreur trompeur en aval.
    console.error("[kie-file-upload] stream-upload rejeté", {
      endpoint: "file-stream-upload",
      httpStatus: response.status,
      httpOk: response.ok,
      parsedSuccess: parsed?.success,
      parsedMsg: parsed?.msg,
      parsedDataKeys: parsed?.data ? Object.keys(parsed.data) : null,
      parsedDataRaw: parsed?.data,
      fileUrlResolved: fileUrl,
      rawBodyPreview: text.slice(0, 800),
      fileName,
      mimeType,
    });
    const err = new Error(parsed?.msg || "KIE file upload failed");
    err.status = response.status;
    err.apiMsg = parsed?.msg;
    err.uploadMethod = "stream";
    err.rawApiResponse = { status: response.status, body: parsed };
    throw err;
  }

  return String(fileUrl);
}

async function uploadUrlToKie(sourceUrl, { uploadPath, fileName }) {
  const apiKey = getKieApiKey();
  if (!apiKey) {
    throw Object.assign(new Error("KIE_AI_API_KEY manquant"), { status: 503 });
  }

  const response = await fetch(`${KIE_FILE_UPLOAD_BASE}/api/file-url-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileUrl: sourceUrl,
      uploadPath,
      fileName,
    }),
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("[kie-file-upload] url-upload réponse non-JSON", {
      status: response.status,
      bodyPreview: text.slice(0, 500),
    });
    throw new Error(`KIE url-upload: réponse non-JSON (${response.status})`);
  }

  const fileUrl = parsed?.data?.fileUrl;
  if (!response.ok || !parsed?.success || !fileUrl) {
    // DIAGNOSTIC (temporaire) — voir commentaire équivalent dans uploadBufferToKie.
    console.error("[kie-file-upload] url-upload rejeté", {
      endpoint: "file-url-upload",
      httpStatus: response.status,
      httpOk: response.ok,
      parsedSuccess: parsed?.success,
      parsedMsg: parsed?.msg,
      parsedDataKeys: parsed?.data ? Object.keys(parsed.data) : null,
      parsedDataRaw: parsed?.data,
      fileUrlResolved: fileUrl,
      rawBodyPreview: text.slice(0, 800),
      sourceUrl,
      fileName,
    });
    const err = new Error(parsed?.msg || "KIE url upload failed");
    err.status = response.status;
    err.apiMsg = parsed?.msg;
    err.uploadMethod = "url";
    err.rawApiResponse = { status: response.status, body: parsed };
    throw err;
  }

  return String(fileUrl);
}

/**
 * Kling / Aleph échouent souvent en "internal error" si le provider ne peut pas fetcher R2.
 * On pousse une copie sur le CDN KIE (stream si besoin).
 */
async function ensureKieAccessibleMediaUrl(sourceUrl, kind = "video") {
  const url = String(sourceUrl || "").trim();
  if (!url.startsWith("http")) return url;
  if (!getKieApiKey()) return url;

  const uploadPath = "luxeflexia-v2v";
  const defaultName =
    kind === "video" ? `clip-${Date.now()}.mp4` : `ref-${Date.now()}.jpg`;
  const fileName = guessFileNameFromUrl(url, defaultName);

  if (/kieai\.|aiquickdraw\.com|redpandaai\.co/i.test(url)) {
    return url;
  }

  try {
    return await uploadUrlToKie(url, { uploadPath, fileName });
  } catch (urlErr) {
    console.warn("[kie-file-upload] url-upload failed, trying stream", {
      kind,
      sourceUrl: url,
      apiMsg: urlErr.apiMsg,
      message: urlErr.message,
      rawApiResponse: urlErr.rawApiResponse,
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`fetch source ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) throw new Error("empty source");
    const mimeType =
      String(response.headers.get("content-type") || "")
        .split(";")[0]
        .trim() || guessMimeFromName(fileName);
    return await uploadBufferToKie(buffer, {
      fileName,
      mimeType,
      uploadPath,
    });
  } catch (streamErr) {
    // Tag pour identifier, en aval, si l'échec vient de la PRÉPARATION
    // de l'upload (ce fichier) et non de Kling/Aleph eux-mêmes.
    streamErr.stage = streamErr.stage || "kie_file_upload";
    streamErr.mediaKind = kind;
    throw streamErr;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  ensureKieAccessibleMediaUrl,
  uploadUrlToKie,
  uploadBufferToKie,
};
