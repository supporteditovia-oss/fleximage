const { refundGenerationCreditsIfCharged } = require("./generation");

const CANCEL_MESSAGE_FR =
  "Génération annulée — tu as relancé une nouvelle vidéo. Jetons remboursés si débités.";

/**
 * Clôture les vidéos encore « processing » pour éviter poll + relances Kie en parallèle
 * quand l'utilisateur en lance une nouvelle.
 */
async function cancelSupersededVideoGenerations(supabase, userId, options = {}) {
  const exceptId = options.exceptGenerationId || null;
  const { data: rows, error } = await supabase
    .from("generations")
    .select("id, metadata, fail_message, status")
    .eq("user_id", userId)
    .eq("generation_type", "video")
    .eq("status", "processing");
  if (error) throw error;

  const toCancel = (rows || []).filter((row) => row.id !== exceptId);
  if (toCancel.length === 0) {
    return { cancelledCount: 0, cancelledIds: [] };
  }

  const now = new Date().toISOString();
  const cancelledIds = [];

  for (const row of toCancel) {
    const meta =
      row.metadata && typeof row.metadata === "object" ? row.metadata : {};
    const failMessage = CANCEL_MESSAGE_FR;
    await supabase
      .from("generations")
      .update({
        status: "failed",
        fail_message: failMessage,
        metadata: {
          ...meta,
          studio_cancelled: true,
          studio_stage: "FAILED",
          studio_cancel_reason: options.reason || "superseded_by_new_video",
          studio_cancelled_at: now,
        },
        updated_at: now,
        completed_at: now,
      })
      .eq("id", row.id)
      .eq("status", "processing");

    await refundGenerationCreditsIfCharged(supabase, {
      userId,
      generationId: row.id,
      source: "video_superseded_cancel",
      failMessage,
    }).catch((err) => console.error("refund superseded video failed", err));

    cancelledIds.push(row.id);
  }

  if (cancelledIds.length > 0) {
    console.info("[video] cancelled superseded processing generations", {
      userId,
      cancelledIds,
      reason: options.reason || "superseded_by_new_video",
    });
  }

  return { cancelledCount: cancelledIds.length, cancelledIds };
}

module.exports = {
  cancelSupersededVideoGenerations,
  CANCEL_MESSAGE_FR,
};
