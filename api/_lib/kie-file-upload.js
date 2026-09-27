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

/** Doc Kie : data.downloadUrl (URL File Upload) ; parfois data.fileUrl (legacy). */
function resolveKieUploadFileUrl(data) {
  if (!data || typeof data !== "object") return null;
  const candidates = [
    data.downloadUrl,
    data.fileUrl,
    data.url,
    data.publicUrl,
  ];
  for (const c of candidates) {
    const s = String(c || "").trim();
    if (s.startsWith("http")) return s;
  }
  return null;
}

function isKieSuccessResponse(parsed, httpOk) {
  if (!httpOk) return false;
  if (parsed?.success === true) return true;
  const code = parsed?.code;
  if (code === 200 || code === "200") return true;
  return false;
}

function buildKieUploadFailure(parsed, httpStatus, endpoint) {
  const data = parsed?.data;
  const resolved = resolveKieUploadFileUrl(data);
  const msg = String(parsed?.msg || "").trim();
  const looksLikeSuccessMsg =
    /upload(ed)? successfully|file upload successful/i.test(msg);

  if (isKieSuccessResponse(parsed, httpStatus >= 200 && httpStatus < 300) && !resolved) {
    const err = new Error(
      "Upload Kie réussi mais URL de fichier absente (downloadUrl manquant). Réessaie ou contacte le support.",
    );
    err.status = 502;
    err.apiMsg = "KIE upload: downloadUrl missing in response";
    err.uploadMethod = endpoint;
    err.rawApiResponse = { status: httpStatus, body: parsed };
    return err;
  }

  const userMsg =
    msg && !looksLikeSuccessMsg
      ? msg
      : `Échec upload média vers Kie (${endpoint})`;
  const err = new Error(userMsg);
  err.status = httpStatus >= 400 ? httpStatus : 502;
  err.apiMsg = looksLikeSuccessMsg ? null : msg || null;
  err.uploadMethod = endpoint;
  err.rawApiResponse = { status: httpStatus, body: parsed };
  return err;
}

function parseKieUploadResponse(text, httpStatus, endpoint) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("[kie-file-upload] réponse non-JSON", {
      endpoint,
      httpStatus,
      bodyPreview: text.slice(0, 500),
    });
    throw new Error(`KIE ${endpoint}: réponse non-JSON (${httpStatus})`);
  }

  const fileUrl = resolveKieUploadFileUrl(parsed?.data);
  const ok = isKieSuccessResponse(parsed, httpStatus >= 200 && httpStatus < 300);

  if (!ok || !fileUrl) {
    console.error("[kie-file-upload] upload rejeté", {
      endpoint,
      httpStatus,
      parsedSuccess: parsed?.success,
      parsedCode: parsed?.code,
      parsedMsg: parsed?.msg,
      parsedDataKeys: parsed?.data ? Object.keys(parsed.data) : null,
      fileUrlResolved: fileUrl,
    });
    throw buildKieUploadFailure(parsed, httpStatus, endpoint);
  }

  return String(fileUrl);
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
  try {
    return parseKieUploadResponse(text, response.status, "file-stream-upload");
  } catch (err) {
    err.stage = err.stage || "kie_file_upload";
    err.uploadMethod = "stream";
    throw err;
  }
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
  try {
    return parseKieUploadResponse(text, response.status, "file-url-upload");
  } catch (err) {
    err.stage = err.stage || "kie_file_upload";
    err.uploadMethod = "url";
    throw err;
  }
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

  if (/kieai\.|aiquickdraw\.com|redpandaai\.co|tempfile\./i.test(url)) {
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
  resolveKieUploadFileUrl,
  isKieSuccessResponse,
};
