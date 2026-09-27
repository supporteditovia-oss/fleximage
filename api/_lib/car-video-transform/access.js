const { getClientIp } = require("../client-ip");

function isProductionEnv() {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

function parseDevWhitelist() {
  const raw = String(process.env.CAR_VIDEO_DEV_USER_IDS || "").trim();
  if (!raw) return new Set();
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

/**
 * Prod : abonné actif ou crédits suffisants (vérifié avant débit).
 * Dev : admin ou whitelist (CAR_VIDEO_DEV_USER_IDS), sauf CAR_VIDEO_DEV_OPEN=1.
 */
async function assertCarVideoGenerationAccess(supabase, userId, { creditCost }) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_subscriber, credits")
    .eq("id", userId)
    .single();

  if (!profile) {
    throw Object.assign(new Error("Profil introuvable"), { status: 404 });
  }

  const isAdmin = profile.role === "admin";

  if (!isProductionEnv()) {
    const devOpen = process.env.CAR_VIDEO_DEV_OPEN === "1";
    const whitelist = parseDevWhitelist();
    if (!devOpen && !isAdmin && !whitelist.has(userId)) {
      throw Object.assign(
        new Error(
          "Fonctionnalité réservée aux comptes admin en environnement de développement.",
        ),
        { status: 403, code: "CAR_VIDEO_DEV_RESTRICTED" },
      );
    }
  } else if (!isAdmin && !profile.is_subscriber) {
    throw Object.assign(
      new Error("Abonnement requis pour lancer une transformation vidéo."),
      { status: 402, code: "PAYMENT_REQUIRED" },
    );
  }

  if (!isAdmin && Number(profile.credits) < creditCost) {
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
  assertCarVideoGenerationAccess,
  bumpCarVideoRateLimit,
  isProductionEnv,
};
