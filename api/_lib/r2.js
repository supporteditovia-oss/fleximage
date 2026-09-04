const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");

function cleanEnv(value) {
  if (value == null) return "";
  let text = String(value).trim();
  // Strip wrapping quotes accidentally stored in env managers.
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }
  // Remove BOM / zero-width / stray newlines that break SigV4.
  return text.replace(/^\uFEFF/, "").replace(/[\r\n\u200B-\u200D\uFEFF]/g, "");
}

function getR2Config() {
  const accountId = cleanEnv(process.env.R2_ACCOUNT_ID);
  const accessKeyId = cleanEnv(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = cleanEnv(process.env.R2_SECRET_ACCESS_KEY);
  const bucketName = cleanEnv(process.env.R2_BUCKET_NAME);
  const publicUrl = cleanEnv(process.env.R2_PUBLIC_URL);
  const explicitEndpoint = cleanEnv(process.env.R2_ENDPOINT);

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    throw Object.assign(new Error("Configuration R2 manquante"), {
      status: 500,
      code: "missing_r2_env",
    });
  }

  const endpoint =
    explicitEndpoint ||
    `https://${accountId}.r2.cloudflarestorage.com`;

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
    endpoint,
  };
}

let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    const config = getR2Config();
    s3Client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // Required for AWS SDK JS >= 3.729 with Cloudflare R2.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      forcePathStyle: true,
    });
  }
  return s3Client;
}

async function uploadToR2(key, body, contentType) {
  const config = getR2Config();
  const client = getS3Client();
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: payload,
      ContentType: contentType,
      ContentLength: payload.length,
    }),
  );
  return `${config.publicUrl.replace(/\/$/, "")}/${key}`;
}

async function deleteFromR2(key) {
  if (!key) return;
  const config = getR2Config();
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    }),
  );
}

async function listR2Objects(prefix, maxKeys = 300) {
  const config = getR2Config();
  const client = getS3Client();
  const objects = [];
  let token;

  while (objects.length < maxKeys) {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucketName,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: Math.min(1000, maxKeys - objects.length),
      }),
    );

    for (const entry of response.Contents || []) {
      if (!entry.Key) continue;
      objects.push({
        key: entry.Key,
        lastModified: entry.LastModified || null,
      });
    }

    if (!response.IsTruncated || !response.NextContinuationToken) break;
    token = response.NextContinuationToken;
  }

  return objects;
}

async function uploadInputImagesToR2(userId, images) {
  if (!images || images.length === 0) return [];

  const uploaded = await Promise.all(
    images.map(async (dataUrl, i) => {
      const match = String(dataUrl).match(/^data:(image\/[\w+.-]+);base64,([\s\S]+)$/);
      if (!match) return null;
      const contentType = match[1];
      const buffer = Buffer.from(match[2], "base64");
      const ext = contentType.split("/")[1] || "jpg";
      const key = `inputs/${userId}/${Date.now()}-${i}.${ext}`;
      return uploadToR2(key, buffer, contentType);
    }),
  );

  return uploaded.filter((url) => typeof url === "string");
}

async function downloadAndStoreImages(larpId, sourceUrls) {
  const { enhanceGeneratedImageBuffer } = require("./enhance-image");
  const r2Urls = [];
  for (let i = 0; i < sourceUrls.length; i++) {
    const sourceUrl = sourceUrls[i];
    try {
      const controller = new AbortController();
      const fetchTimer = setTimeout(() => controller.abort(), 15_000);
      let response;
      try {
        response = await fetch(sourceUrl, { signal: controller.signal });
      } finally {
        clearTimeout(fetchTimer);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      let contentType = response.headers.get("content-type") || "image/jpeg";
      let buffer = Buffer.from(await response.arrayBuffer());
      const enhanced = await enhanceGeneratedImageBuffer(buffer, contentType);
      buffer = enhanced.buffer;
      contentType = enhanced.contentType;
      const ext = enhanced.extension;
      const key = `larps/${larpId}/${i}${ext}`;
      r2Urls.push(await uploadToR2(key, buffer, contentType));
    } catch (err) {
      console.error("R2 re-upload failed, keeping source URL", err);
      r2Urls.push(sourceUrl);
    }
  }
  return r2Urls;
}

module.exports = {
  uploadToR2,
  deleteFromR2,
  listR2Objects,
  uploadInputImagesToR2,
  downloadAndStoreImages,
  getR2Config,
  getS3Client,
};
