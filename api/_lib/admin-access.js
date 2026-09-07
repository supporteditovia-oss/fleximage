/** Fonctionnalités catalogue / outfits en preview — réservées aux admins. */
async function isUserAdmin(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.warn("isUserAdmin profile lookup failed", error);
    return false;
  }
  return data?.role === "admin";
}

module.exports = { isUserAdmin };
