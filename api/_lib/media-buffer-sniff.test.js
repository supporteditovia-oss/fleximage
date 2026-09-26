const test = require("node:test");
const assert = require("node:assert/strict");
const {
  sniffVideoContentType,
  normalizeVideoDataUrlContentType,
} = require("./media-buffer-sniff");

test("sniff mp4 ftyp", () => {
  const buf = Buffer.alloc(12);
  buf.write("    ftyp", 0);
  assert.equal(sniffVideoContentType(buf), "video/mp4");
});

test("octet-stream mp4 → video/mp4", () => {
  const buf = Buffer.alloc(12);
  buf.write("    ftyp", 0);
  assert.equal(
    normalizeVideoDataUrlContentType("application/octet-stream", buf),
    "video/mp4",
  );
});
