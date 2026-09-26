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
    throw new Error(`KIE upload: réponse non-JSON (${response.status})`);
  }

  const fileUrl = parsed?.data?.fileUrl;
  if (!response.ok || !parsed?.success || !fileUrl) {
    const err = new Error(parsed?.msg || "KIE file upload failed");
    err.status = response.status;
    err.apiMsg = parsed?.msg;
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
    throw new Error(`KIE url-upload: réponse non-JSON (${response.status})`);
  }

  const fileUrl = parsed?.data?.fileUrl;
  if (!response.ok || !parsed?.success || !fileUrl) {
    const err = new Error(parsed?.msg || "KIE url upload failed");
    err.status = response.status;
    err.apiMsg = parsed?.msg;
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
    console.warn("[kie-file-upload] url-upload failed, trying stream", urlErr.message);
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
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  ensureKieAccessibleMediaUrl,
  uploadUrlToKie,
  uploadBufferToKie,
};
