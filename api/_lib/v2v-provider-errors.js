function providerErrorText(err) {
  return `${err?.apiMsg || ""} ${err?.message || ""}`.trim();
}

function isKlingCharacterRejection(err) {
  return /no valid characters detected/i.test(providerErrorText(err));
}

function isRetryableAlephError(err) {
  return /internal error|please try again later|aleph api error|video too large/i.test(
    providerErrorText(err),
  );
}

async function resetVideoProviderClaim(supabase, generationId, baseMetadata) {
  const meta =
    baseMetadata && typeof baseMetadata === "object" ? baseMetadata : {};
  await supabase
    .from("generations")
    .update({
      metadata: { ...meta, video_api_call_count: 0 },
      updated_at: new Date().toISOString(),
    })
    .eq("id", generationId);
}

module.exports = {
  providerErrorText,
  isKlingCharacterRejection,
  isRetryableAlephError,
  resetVideoProviderClaim,
};
