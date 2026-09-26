function sniffVideoContentType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  const box = buffer.slice(4, 8).toString("ascii");
  if (box === "ftyp") return "video/mp4";
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return "video/webm";
  }
  return null;
}

function normalizeVideoDataUrlContentType(contentType, buffer) {
  const mime = String(contentType || "")
    .trim()
    .toLowerCase()
    .split(";")[0];
  if (mime.startsWith("video/")) return mime;
  const sniffed = sniffVideoContentType(buffer);
  return sniffed || "video/mp4";
}

module.exports = { sniffVideoContentType, normalizeVideoDataUrlContentType };
