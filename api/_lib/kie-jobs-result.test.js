const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  extractKieJobsVideoUrl,
  extractKieJobsFailMessage,
} = require("./kie-jobs-result");

test("extractKieJobsVideoUrl reads resultUrls", () => {
  const url = extractKieJobsVideoUrl({
    resultJson: JSON.stringify({
      resultUrls: ["https://cdn.example/out.mp4"],
    }),
  });
  assert.equal(url, "https://cdn.example/out.mp4");
});

test("extractKieJobsVideoUrl fallbacks video_url and nested response", () => {
  assert.equal(
    extractKieJobsVideoUrl({
      resultJson: JSON.stringify({ video_url: "https://a/v.mp4" }),
    }),
    "https://a/v.mp4",
  );
  assert.equal(
    extractKieJobsVideoUrl({
      response: { videoUrl: "https://b/v.mp4" },
    }),
    "https://b/v.mp4",
  );
});

test("extractKieJobsFailMessage reads failMsg and resultJson", () => {
  assert.equal(
    extractKieJobsFailMessage({ failMsg: "Insufficient credits" }),
    "Insufficient credits",
  );
  assert.equal(
    extractKieJobsFailMessage({
      resultJson: JSON.stringify({ failMsg: "blocked prompt" }),
    }),
    "blocked prompt",
  );
});
