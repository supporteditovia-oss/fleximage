const { getClientIp } = require("../client-ip");

/** Preview admin — clients n’y ont pas accès (UI + API). */
async function assertCarVideoAdminAccess(supabase, userId) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, credits")
    .eq("id", userId)
    .single();

  if (!profile) {
    throw Object.assign(new Error("Profil introuvable"), { status: 404 });
  }

  const isAdmin = profile.role === "admin";
  if (!isAdmin) {
    throw Object.assign(
      new Error("Fonctionnalité réservée aux administrateurs."),
      { status: 403, code: "CAR_VIDEO_ADMIN_ONLY" },
    );
  }

  return { profile, isAdmin: true };
}

async function assertCarVideoGenerationAccess(supabase, userId, { creditCost }) {
  const { profile, isAdmin } = await assertCarVideoAdminAccess(supabase, userId);
  if (creditCost > 0 && Number(profile.credits) < creditCost) {
    throw Object.assign(new Error("Plus assez de jetons pour cette génération."), {
      status: 402,
      code: "INSUFFICIENT_CREDITS",
    });
  }
  return { profile, isAdmin };
}

async function bumpCarVideoRateLimit(supabase, userId, req) {
  const ip = getClientIp(req);
  const windowStart = new Date();
  windowStart.setUTCSeconds(0, 0);
  windowStart.setUTCMinutes(Math.floor(windowStart.getUTCMinutes()));

  const subjects = [
    { subject_type: "user", subject_hash: userId },
    { subject_type: "ip", subject_hash: ip || "unknown" },
  ];

  for (const sub of subjects) {
    const { data: row } = await supabase
      .from("generation_rate_limits")
      .select("request_count")
      .eq("subject_type", sub.subject_type)
      .eq("subject_hash", sub.subject_hash)
      .eq("window_start", windowStart.toISOString())
      .eq("window_seconds", 60)
      .maybeSingle();

    const next = Number(row?.request_count || 0) + 1;
    if (next > 12) {
      throw Object.assign(new Error("Trop de requêtes. Réessaie dans une minute."), {
        status: 429,
        code: "RATE_LIMIT",
      });
    }

    await supabase.from("generation_rate_limits").upsert(
      {
        subject_type: sub.subject_type,
        subject_hash: sub.subject_hash,
        window_start: windowStart.toISOString(),
        window_seconds: 60,
        request_count: next,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "subject_type,subject_hash,window_start,window_seconds" },
    );
  }
}

module.exports = {
  assertCarVideoAdminAccess,
  assertCarVideoGenerationAccess,
  bumpCarVideoRateLimit,
};
