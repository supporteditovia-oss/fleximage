const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveKieUploadFileUrl,
  isKieSuccessResponse,
} = require("./kie-file-upload");

test("resolveKieUploadFileUrl — downloadUrl (doc Kie officielle)", () => {
  const url = resolveKieUploadFileUrl({
    downloadUrl: "https://tempfile.redpandaai.co/x/clip.mp4",
    fileName: "clip.mp4",
  });
  assert.equal(url, "https://tempfile.redpandaai.co/x/clip.mp4");
});

test("resolveKieUploadFileUrl — fileUrl legacy", () => {
  const url = resolveKieUploadFileUrl({
    fileUrl: "https://kieai.redpandaai.co/files/clip.mp4",
  });
  assert.equal(url, "https://kieai.redpandaai.co/files/clip.mp4");
});

test("resolveKieUploadFileUrl — préfère downloadUrl", () => {
  const url = resolveKieUploadFileUrl({
    downloadUrl: "https://a.co/d",
    fileUrl: "https://b.co/f",
  });
  assert.equal(url, "https://a.co/d");
});

test("isKieSuccessResponse — success true", () => {
  assert.equal(isKieSuccessResponse({ success: true }, true), true);
});

test("isKieSuccessResponse — code 200", () => {
  assert.equal(isKieSuccessResponse({ code: 200 }, true), true);
});

test("normalizeImageForKie — convertit un WebP 9:16 en JPEG (Kie refuse le WebP)", async () => {
  const http = require("node:http");
  const sharp = require("sharp");
  const { normalizeImageForKie, sniffKieSafeImageType } = require("./kie-file-upload");
  const webp = await sharp({
    create: { width: 360, height: 640, channels: 3, background: "#336699" },
  })
    .webp()
    .toBuffer();
  const png = await sharp({
    create: { width: 40, height: 40, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();
  const server = http.createServer((req, res) => {
    res.end(req.url.endsWith("png") ? png : webp);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const out = await normalizeImageForKie(`${base}/a.webp`, "a.webp");
    assert.equal(out.mimeType, "image/jpeg");
    assert.equal(out.fileName, "a.jpg");
    assert.equal(sniffKieSafeImageType(out.buffer), "jpeg");
    const meta = await sharp(out.buffer).metadata();
    assert.deepEqual([meta.width, meta.height], [360, 640]);
    // PNG déjà accepté : pas de conversion
    assert.equal(await normalizeImageForKie(`${base}/b.png`, "b.png"), null);
  } finally {
    server.close();
  }
});
