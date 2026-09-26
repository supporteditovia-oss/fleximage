/** Libère les lignes bloquées en processing (poll interrompu, client fermé, etc.). */
const STALE_PROCESSING_MS = 12 * 60 * 1000;

async function failStaleProcessingGenerations(supabase, userId) {
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  const { data, error } = await supabase
    .from("generations")
    .update({
      status: "failed",
      fail_message:
        "Génération expirée (session interrompue). Tu peux relancer — crédits remboursés si débités.",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "processing")
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    console.warn("[stale-processing] cleanup failed", error.message);
    return 0;
  }
  const count = data?.length ?? 0;
  if (count > 0) {
    console.info("[stale-processing] marked stale rows failed", {
      userId,
      count,
    });
  }
  return count;
}

module.exports = { failStaleProcessingGenerations, STALE_PROCESSING_MS };
