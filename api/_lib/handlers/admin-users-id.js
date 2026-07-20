const { requireAdmin, readBody, sendError } = require("../admin-auth");

const PLAN_CREDITS = {
  discovery: 250,
  essential: 1100,
  ultimate: 2500,
};

const PLAN_ENV_KEYS = {
  discovery: "STRIPE_DISCOVERY_PRICE_ID",
  essential: "STRIPE_ESSENTIAL_PRICE_ID",
  ultimate: "STRIPE_ULTIMATE_PRICE_ID",
};

function normalizePlan(plan) {
  if (plan === "ultimate") return "ultimate";
  if (plan === "essential" || plan === "monthly" || plan === "video") {
    return "essential";
  }
  if (plan === "discovery" || plan === "weekly" || plan === "image") {
    return "discovery";
  }
  return null;
}

function resolveUserId(req) {
  const raw = req.query && req.query.id;
  if (Array.isArray(raw)) return raw[0];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  // Fallback for some Vercel runtimes that expose path params differently
  const url = typeof req.url === "string" ? req.url : "";
  const match = url.match(/\/api\/admin\/users\/([^/?#]+)/i);
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

async function deleteUserCompletely(supabase, userId) {
  // Auth user owns the profile (profiles.id → auth.users.id ON DELETE CASCADE).
  // Deleting Auth first removes the profile + cascaded generations/ledger/etc.
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) {
    // If auth user already gone, still clean leftover profile row.
    const missing =
      /not\s*found/i.test(authError.message || "") ||
      authError.status === 404 ||
      authError.code === "user_not_found";
    if (!missing) {
      throw Object.assign(new Error(authError.message || "Auth delete failed"), {
        status: 500,
        code: authError.code,
      });
    }
  }

  // Best-effort cleanup if cascade missed anything (or auth was already gone).
  await supabase.from("profiles").delete().eq("id", userId);

  // Confirm profile is gone
  const { data: leftover } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (leftover) {
    throw Object.assign(
      new Error("Le profil existe encore après suppression."),
      { status: 500, code: "delete_incomplete" },
    );
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const { supabase, adminUserId } = await requireAdmin(req);
    const id = resolveUserId(req);
    if (!id) {
      res.status(400).json({ message: "User id required" });
      return;
    }

    if (req.method === "DELETE") {
      if (id === adminUserId) {
        res.status(400).json({
          message: "Impossible de supprimer ton propre compte admin.",
        });
        return;
      }

      const { data: existing } = await supabase
        .from("profiles")
        .select("id, email, role")
        .eq("id", id)
        .maybeSingle();

      if (!existing) {
        // Also try auth-only orphan
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError && !/not\s*found/i.test(authError.message || "")) {
          throw authError;
        }
        res.status(200).json({ message: "Utilisateur déjà absent", deleted: true });
        return;
      }

      await deleteUserCompletely(supabase, id);

      res.status(200).json({
        message: "Utilisateur supprimé",
        deleted: true,
        email: existing.email || null,
      });
      return;
    }

    if (req.method === "PATCH") {
      const body = readBody(req);
      const profileUpdates = {};

      if (typeof body.is_subscriber === "boolean") {
        profileUpdates.is_subscriber = body.is_subscriber;
      }
      if (body.role === "user" || body.role === "admin") {
        profileUpdates.role = body.role;
      }

      const adminPlan = body.admin_plan;
      if (adminPlan === "free") {
        profileUpdates.is_subscriber = false;
        profileUpdates.subscription_status = "canceled";
      } else if (adminPlan) {
        const planType = normalizePlan(adminPlan);
        if (!planType) {
          res.status(400).json({ message: "Plan invalide" });
          return;
        }
        const priceId = process.env[PLAN_ENV_KEYS[planType]] || `admin_${planType}`;
        profileUpdates.is_subscriber = true;
        profileUpdates.subscription_status = "active";

        const { data: profile } = await supabase
          .from("profiles")
          .select("stripe_subscription_id, stripe_customer_id")
          .eq("id", id)
          .single();

        await supabase.from("subscriptions").upsert(
          {
            user_id: id,
            stripe_subscription_id:
              (profile && profile.stripe_subscription_id) || `admin_override_${id}`,
            stripe_customer_id:
              (profile && profile.stripe_customer_id) || `admin_override_${id}`,
            status: "active",
            price_id: priceId,
            plan_type: planType,
            credits_per_cycle: PLAN_CREDITS[planType],
            billing_interval: "month",
            canceled_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_subscription_id" },
        );
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      if (adminPlan === "free") {
        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", id)
          .in("status", ["active", "trialing"]);
      }

      res.status(200).json(data);
      return;
    }

    res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("admin users/[id] error", error);
    sendError(res, error);
  }
};
