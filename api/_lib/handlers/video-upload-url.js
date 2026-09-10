const { requireUser, readBody, sendError } = require("../user-auth");
const { createPresignedVideoUploadUrl } = require("../r2");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { userId } = await requireUser(req);
    const body = readBody(req);
    const contentType =
      typeof body.contentType === "string" ? body.contentType : "video/mp4";
    const fileSizeBytes = Number(body.fileSizeBytes);

    const result = await createPresignedVideoUploadUrl(userId, {
      contentType,
      fileSizeBytes,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("video-upload-url error", error);
    sendError(res, error);
  }
};
