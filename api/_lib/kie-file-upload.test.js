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
