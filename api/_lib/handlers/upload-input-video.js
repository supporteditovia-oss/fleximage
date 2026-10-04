const { requireUser, readBody, sendError } = require("../user-auth");
const { uploadInputVideoToR2 } = require("../r2");
const { VIDEO_V2V_MAX_SIZE_BYTES } = require("../video-limits");

/**
 * Repli quand le PUT presigné R2 échoue depuis le navigateur (CORS / « Load failed »).
 * Corps JSON { video: "data:video/...;base64,..." } — garder la vidéo ≤ ~3 Mo côté client.
 */
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { userId } = await requireUser(req);
    const body = readBody(req);
    const dataUrl =
      typeof body.video === "string"
        ? body.video
        : Array.isArray(body.videos)
          ? body.videos[0]
          : null;

    if (!dataUrl || !String(dataUrl).startsWith("data:video/")) {
      res.status(422).json({
        code: "VIDEO_REQUIRED",
        message: "Vidéo requise (data URL).",
      });
      return;
    }

    const match = String(dataUrl).match(/^data:video\/[\w+.-]+;base64,([\s\S]+)$/);
    if (match) {
      const byteLen = Buffer.byteLength(match[1], "base64");
      if (byteLen > VIDEO_V2V_MAX_SIZE_BYTES) {
        res.status(422).json({
          code: "VIDEO_TOO_LARGE",
          message: `Vidéo trop lourde (max ${Math.round(VIDEO_V2V_MAX_SIZE_BYTES / (1024 * 1024))} Mo).`,
        });
        return;
      }
    }

    const videoUrl = await uploadInputVideoToR2(userId, dataUrl);
    if (!videoUrl) {
      res.status(422).json({
        code: "VIDEO_UPLOAD_FAILED",
        message: "Échec enregistrement vidéo.",
      });
      return;
    }

    res.status(200).json({ videoUrl });
  } catch (error) {
    console.error("upload-input-video error", error);
    sendError(res, error);
  }
};

module.exports.config = {
  api: {
    bodyParser: { sizeLimit: "12mb" },
  },
  maxDuration: 60,
};
