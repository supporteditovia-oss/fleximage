const { requireUser, readBody, sendError } = require("../../user-auth");
const { createCarVideoPresignedUpload } = require("../../car-video-transform/upload-presign");
const { bumpCarVideoRateLimit } = require("../../car-video-transform/access");

module.exports = async function carVideoUploadHandler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { supabase, userId } = await requireUser(req);
    await bumpCarVideoRateLimit(supabase, userId, req);
    const body = readBody(req);
    const result = await createCarVideoPresignedUpload(userId, {
      contentType: body.contentType,
      fileSizeBytes: body.fileSizeBytes,
    });

    res.status(200).json({
      uploadUrl: result.uploadUrl,
      videoUrl: result.videoUrl,
      fileKey: result.key,
      contentType: result.contentType,
      status: "uploaded",
    });
  } catch (error) {
    console.error("car-video upload error", error?.code || error?.message);
    sendError(res, error);
  }
};
