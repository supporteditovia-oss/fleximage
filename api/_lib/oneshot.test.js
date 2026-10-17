const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createOneshotJob,
  uploadImageUrlsToOneshot,
} = require("./oneshot");

test("createOneshotJob sends every reference file and requests one output", async () => {
  const previousFetch = global.fetch;
  const previousUrl = process.env.ONESHOT_API_URL;
  const previousKey = process.env.ONESHOT_API_KEY;
  let requestBody;

  process.env.ONESHOT_API_URL = "https://api.oneshot.example";
  process.env.ONESHOT_API_KEY = "test-key";
  global.fetch = async (url, options) => {
    assert.equal(url, "https://api.oneshot.example/v1/jobs");
    requestBody = JSON.parse(options.body);
    return Response.json({ id: "job-123" });
  };

  try {
    const result = await createOneshotJob("Generate an image", {
      generationId: "generation-123",
      aspectRatio: "16:9",
      referenceFileIds: ["ref-1", "ref-2", "ref-3"],
    });

    assert.equal(result.id, "job-123");
    assert.deepEqual(requestBody.options.referenceFileIds, [
      "ref-1",
      "ref-2",
      "ref-3",
    ]);
    assert.equal(requestBody.options.aspectRatio, "16:9");
    assert.equal(requestBody.options.modelVariant, "fast");
    assert.equal(requestBody.options.numberOfImages, 1);
    assert.equal(requestBody.options.candidateCount, 1);
    assert.equal(requestBody.options.n, 1);
  } finally {
    global.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.ONESHOT_API_URL;
    else process.env.ONESHOT_API_URL = previousUrl;
    if (previousKey === undefined) delete process.env.ONESHOT_API_KEY;
    else process.env.ONESHOT_API_KEY = previousKey;
  }
});

test("uploadImageUrlsToOneshot uploads and returns every reference", async () => {
  const previousFetch = global.fetch;
  const previousUrl = process.env.ONESHOT_API_URL;
  const previousKey = process.env.ONESHOT_API_KEY;
  const signedFiles = [];

  process.env.ONESHOT_API_URL = "https://api.oneshot.example";
  process.env.ONESHOT_API_KEY = "test-key";
  global.fetch = async (url, options = {}) => {
    if (url.startsWith("https://source.test/")) {
      return new Response(Buffer.alloc(300), {
        headers: { "content-type": "image/jpeg" },
      });
    }
    if (url === "https://api.oneshot.example/v1/uploads/sign") {
      const signRequest = JSON.parse(options.body);
      const fileId = `file-${signRequest.filename}`;
      signedFiles.push(fileId);
      return Response.json({
        fileId,
        uploadUrl: `https://upload.test/${fileId}`,
      });
    }
    if (url.startsWith("https://upload.test/")) {
      return new Response(null, { status: 200 });
    }
    if (url === "https://api.oneshot.example/v1/uploads/complete") {
      return new Response(null, { status: 200 });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const fileIds = await uploadImageUrlsToOneshot([
      "https://source.test/ref-1.jpg",
      "https://source.test/ref-2.jpg",
    ]);

    assert.deepEqual(fileIds, ["file-ref-1.jpg", "file-ref-2.jpg"]);
    assert.equal(signedFiles.length, 2);
  } finally {
    global.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.ONESHOT_API_URL;
    else process.env.ONESHOT_API_URL = previousUrl;
    if (previousKey === undefined) delete process.env.ONESHOT_API_KEY;
    else process.env.ONESHOT_API_KEY = previousKey;
  }
});
