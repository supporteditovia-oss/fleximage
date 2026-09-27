const { requireUser, sendError } = require("../../user-auth");
const { maybePollCarVideoGeneration } = require("../../car-video-transform/poll");

function publicStatusLabel(status) {
  const map = {
    uploaded: "Vidéo ajoutée",
    validating: "Vérification de la vidéo…",
    queued: "Votre vidéo est dans la file d'attente",
    processing: "Transformation IA en cours… Cela peut prendre quelques minutes.",
    completed: "Votre vidéo est prête",
    failed:
      "La génération a échoué. Aucun nouveau crédit n'a été consommé automatiquement.",
  };
  return map[status] || status;
}

function toClientPayload(row) {
  const payload = {
    generationId: row.id,
    status: row.status,
    statusLabel: publicStatusLabel(row.status),
    durationSeconds: Number(row.input_video_duration_seconds),
    creditsEstimated: row.credits_estimated,
    resolution: row.resolution,
    planType: row.plan_type,
    selectedVehicle: row.selected_vehicle,
    progress:
      row.metadata && typeof row.metadata === "object"
        ? row.metadata.poyo_progress ?? null
        : null,
  };
  if (row.status === "completed" && row.output_video_url) {
    payload.outputVideoUrl = row.output_video_url;
  }
  if (row.status === "failed") {
    payload.errorMessage =
      row.error_message ||
      "La génération a échoué. Aucun nouveau crédit n'a été consommé automatiquement.";
  }
  return payload;
}

module.exports = async function carVideoGetHandler(req, res, generationId) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { supabase, userId } = await requireUser(req);
    const { data: row, error } = await supabase
      .from("car_video_generations")
      .select("*")
      .eq("id", generationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!row) {
      res.status(404).json({ message: "Génération introuvable" });
      return;
    }

    let current = row;
    if (current.status === "processing" || current.status === "queued") {
      current = await maybePollCarVideoGeneration(supabase, current);
    }

    res.status(200).json(toClientPayload(current));
  } catch (error) {
    console.error("car-video get error", error?.message);
    sendError(res, error);
  }
};
