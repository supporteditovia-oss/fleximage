const { downloadAndStoreVideo } = require("../r2");
const {
  getPoyoTaskStatus,
  extractPoyoVideoUrl,
  mapPoyoStatusToInternal,
} = require("./poyo-client");
const { CAR_VIDEO_POYO_POLL_MIN_MS } = require("./constants");
const { refundCarVideoCreditsIfCharged } = require("./credits");

async function maybePollCarVideoGeneration(supabase, row) {
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const lastPollMs = Number(meta.last_poyo_poll_ms || 0);
  const now = Date.now();
  if (now - lastPollMs < CAR_VIDEO_POYO_POLL_MIN_MS) {
    return row;
  }

  if (!row.poyo_task_id) return row;
  if (row.status === "completed" || row.status === "failed") return row;

  let poyoData;
  try {
    poyoData = await getPoyoTaskStatus(row.poyo_task_id);
  } catch (err) {
    console.error("[car-video] poyo poll error", { id: row.id, err: err.message });
    return row;
  }

  const internalStatus = mapPoyoStatusToInternal(poyoData.status);
  const patch = {
    updated_at: new Date().toISOString(),
    metadata: {
      ...meta,
      last_poyo_poll_ms: now,
      poyo_progress: poyoData.progress ?? null,
      poyo_status: poyoData.status,
    },
  };

  if (internalStatus === "completed") {
    const remoteUrl = extractPoyoVideoUrl(poyoData);
    let outputUrl = remoteUrl;
    if (remoteUrl) {
      try {
        const stored = await downloadAndStoreVideo(row.id, remoteUrl);
        if (Array.isArray(stored) && stored[0]) outputUrl = stored[0];
      } catch (storeErr) {
        console.error("[car-video] store output failed", storeErr);
      }
    }
    patch.status = "completed";
    patch.output_video_url = outputUrl;
    patch.completed_at = new Date().toISOString();
    patch.error_message = null;
    patch.error_code = null;
  } else if (internalStatus === "failed") {
    patch.status = "failed";
    patch.error_code = "POYO_FAILED";
    patch.error_message =
      poyoData.error_message || "La génération PoYo a échoué.";
    patch.completed_at = new Date().toISOString();
    await refundCarVideoCreditsIfCharged(supabase, {
      userId: row.user_id,
      generationId: row.id,
      reason: "poyo_failed",
    });
  } else {
    patch.status = internalStatus === "queued" ? "queued" : "processing";
  }

  const { data: updated } = await supabase
    .from("car_video_generations")
    .update(patch)
    .eq("id", row.id)
    .select("*")
    .single();

  return updated || row;
}

module.exports = { maybePollCarVideoGeneration };
