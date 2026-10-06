/**
 * Extraction URL / erreurs depuis Kie Jobs API (recordInfo → data.resultJson).
 */

function parseResultJson(data) {
  const raw = data?.resultJson;
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

function firstHttpUrl(value) {
  if (typeof value === "string" && value.startsWith("http")) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstHttpUrl(item);
      if (found) return found;
    }
  }
  if (value && typeof value === "object") {
    for (const key of [
      "url",
      "videoUrl",
      "video_url",
      "resultVideoUrl",
      "downloadUrl",
      "download_url",
    ]) {
      const found = firstHttpUrl(value[key]);
      if (found) return found;
    }
  }
  return null;
}

function extractKieJobsVideoUrl(data) {
  const parsed = parseResultJson(data);
  if (parsed) {
    const fromUrls = firstHttpUrl(parsed.resultUrls);
    if (fromUrls) return fromUrls;
    const fromVideos = firstHttpUrl(parsed.videos);
    if (fromVideos) return fromVideos;
    const fromOutput = firstHttpUrl(parsed.output);
    if (fromOutput) return fromOutput;
    const direct = firstHttpUrl(
      parsed.video_url ??
        parsed.videoUrl ??
        parsed.resultVideoUrl ??
        parsed.url,
    );
    if (direct) return direct;
    const nested = firstHttpUrl(parsed.response ?? parsed.data ?? parsed.result);
    if (nested) return nested;
  }

  return (
    firstHttpUrl(data?.response) ??
    firstHttpUrl(data?.resultVideoUrl) ??
    firstHttpUrl(data?.videoUrl) ??
    firstHttpUrl(data?.video_url) ??
    firstHttpUrl(data?.videoInfo?.videoUrl) ??
    null
  );
}

function extractKieJobsFailMessage(data) {
  const direct = String(data?.failMsg || data?.errorMessage || "").trim();
  if (direct) return direct;
  const parsed = parseResultJson(data);
  if (parsed) {
    const fromJson = String(
      parsed.failMsg || parsed.errorMessage || parsed.message || parsed.error || "",
    ).trim();
    if (fromJson) return fromJson;
  }
  return "";
}

module.exports = {
  parseResultJson,
  extractKieJobsVideoUrl,
  extractKieJobsFailMessage,
};
