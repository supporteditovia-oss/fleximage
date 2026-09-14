const { getSupabaseAdmin } = require("../_lib/user-auth");
const { sendPreviewExpiryEmail } = require("../_lib/preview-expiry-email");

function assertCronAuth(req) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    throw Object.assign(new Error("CRON_SECRET not configured"), { status: 503 });
  }
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token !== secret) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    assertCronAuth(req);
    const supabase = getSupabaseAdmin();
    const nowIso = new Date().toISOString();

    const { data: locks, error } = await supabase
      .from("funnel_preview_locks")
      .select("id, user_id, expires_at")
      .lte("expires_at", nowIso)
      .is("reminder_sent_at", null)
      .is("recovered_at", null)
      .limit(50);

    if (error) throw error;

    let sent = 0;
    let skipped = 0;
    const errors = [];

    for (const lock of locks || []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name, preferred_locale, is_subscriber, role")
        .eq("id", lock.user_id)
        .maybeSingle();

      if (!profile?.email || profile.is_subscriber || profile.role === "admin") {
        await supabase
          .from("funnel_preview_locks")
          .update({
            recovered_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", lock.id);
        skipped += 1;
        continue;
      }

      try {
        const firstName = profile.full_name?.trim().split(/\s+/)[0] || "";
        const outcome = await sendPreviewExpiryEmail({
          to: profile.email,
          locale: profile.preferred_locale || "fr",
          firstName,
        });

        if (!outcome.sent) {
          skipped += 1;
          continue;
        }

        await supabase
          .from("funnel_preview_locks")
          .update({
            reminder_sent_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", lock.id);
        sent += 1;
      } catch (mailErr) {
        console.error("preview expiry email failed", {
          lockId: lock.id,
          err: mailErr,
        });
        errors.push(String(mailErr?.message || mailErr));
      }
    }

    res.status(200).json({
      processed: (locks || []).length,
      sent,
      skipped,
      errors: errors.slice(0, 5),
    });
  } catch (error) {
    console.error("preview-expiry-reminders cron error", error);
    const status = Number(error?.status) || 500;
    res.status(status).json({
      message: error?.message || "Cron error",
    });
  }
};
