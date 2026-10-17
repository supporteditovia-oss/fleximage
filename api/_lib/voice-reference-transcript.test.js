const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeCloneReferenceTranscript,
  extractTranscriptFromAsrPayload,
} = require("./voice-reference-transcript");

test("normalizeCloneReferenceTranscript — liaisons ASR", () => {
  assert.equal(
    normalizeCloneReferenceTranscript("Salut c est Niska, j ai un test"),
    "Salut c'est Niska, j'ai un test",
  );
});

test("extractTranscriptFromAsrPayload — segments", () => {
  const text = extractTranscriptFromAsrPayload({
    text: "Salut",
    segments: [{ text: "Salut c'est" }, { text: "Niska" }],
  });
  assert.match(text, /Niska/);
});
