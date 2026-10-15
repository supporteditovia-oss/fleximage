const { isUserAdmin } = require("./admin-access");

/**
 * Studio I2V voix + son — réservé admin (preview), pas les clients prod.
 */
function isI2VAdminStudioEnabled(context = {}) {
  return context.isAdmin === true;
}

async function resolveI2VAdminStudioAccess(req) {
  const { requireUser } = require("./user-auth");
  const { supabase, userId } = await requireUser(req);
  const admin = await isUserAdmin(supabase, userId);
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", userId)
    .maybeSingle();
  const isAdmin = admin || profile?.role === "admin";
  return { supabase, userId, isAdmin, profile };
}

function assertI2VAdminStudio(isAdmin) {
  if (!isI2VAdminStudioEnabled({ isAdmin })) {
    throw Object.assign(new Error("Admin only"), {
      status: 403,
      code: "I2V_ADMIN_ONLY",
    });
  }
}

module.exports = {
  isI2VAdminStudioEnabled,
  resolveI2VAdminStudioAccess,
  assertI2VAdminStudio,
};
