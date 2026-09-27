const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { getR2Config, getS3Client } = require("../r2");
const {
  validateUploadMime,
  validateFileSizeBytes,
} = require("./validate");
const { CAR_VIDEO_MAX_SIZE_BYTES } = require("./constants");

async function createCarVideoPresignedUpload(userId, { contentType, fileSizeBytes }) {
  const mimeResult = validateUploadMime(contentType);
  if (!mimeResult.ok) {
    throw Object.assign(new Error(mimeResult.message), {
      status: 422,
      code: mimeResult.code,
    });
  }
  const sizeResult = validateFileSizeBytes(fileSizeBytes);
  if (!sizeResult.ok) {
    throw Object.assign(new Error(sizeResult.message), {
      status: 422,
      code: sizeResult.code,
    });
  }
  if (Number(fileSizeBytes) > CAR_VIDEO_MAX_SIZE_BYTES) {
    throw Object.assign(
      new Error(
        `Fichier trop lourd (max ${Math.round(CAR_VIDEO_MAX_SIZE_BYTES / (1024 * 1024))} Mo).`,
      ),
      { status: 422, code: "FILE_TOO_LARGE" },
    );
  }

  const mime = mimeResult.mime;
  const config = getR2Config();
  const ext =
    mime === "video/quicktime"
      ? "mov"
      : mime.split("/")[1]?.replace(/[^a-z0-9+.-]/gi, "") || "mp4";
  const key = `inputs/${userId}/${Date.now()}-car-source.${ext}`;
  const client = getS3Client();
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      ContentType: mime,
      ContentLength: Number(fileSizeBytes),
    }),
    { expiresIn: 900 },
  );
  const videoUrl = `${config.publicUrl.replace(/\/$/, "")}/${key}`;
  return { uploadUrl, videoUrl, key, contentType: mime };
}

module.exports = { createCarVideoPresignedUpload };
