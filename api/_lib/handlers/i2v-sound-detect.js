const { requireUser, readBody } = require("../user-auth");
const { isUserAdmin } = require("../admin-access");
const { detectI2VSoundWithGemini } = require("../i2v-sound-auto");
const { isI2VSoundStudioEnabledForUser } = require("../i2v-sound-rollout");

/** Aperçu UI — détection ambiance / effet / filtre voix depuis le prompt scène. */
module.exports = async function i2vSoundDetectHandler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { supabase, userId } = await requireUser(req);
    const admin = await isUserAdmin(supabase, userId);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", userId)
      .maybeSingle();
    const isAdmin = admin || profile?.role === "admin";

    if (!isI2VSoundStudioEnabledForUser({ isAdmin })) {
      res.status(403).json({
        code: "I2V_ADMIN_ONLY",
        message: "Son automatique réservé aux comptes admin.",
      });
      return;
    }

    const body = readBody(req);
    const motionPrompt =
      typeof body.motion_prompt === "string" ? body.motion_prompt.trim() : "";
    const imageDescription =
      typeof body.image_description === "string"
        ? body.image_description.trim()
        : "";

    const detection = await detectI2VSoundWithGemini({
      motionPrompt,
      imageDescription,
    });

    res.status(200).json({ detection });
  } catch (error) {
    console.error("[i2v-sound-detect]", error);
    const status = Number(error?.status) || 500;
    res.status(status).json({
      message: error?.message || "Détection son impossible.",
    });
  }
};
