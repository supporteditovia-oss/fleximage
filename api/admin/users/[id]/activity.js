const { requireAdmin, sendError } = require("../../../_lib/admin-auth");

function toClientStatus(status) {
  if (status === "success" || status === "completed" || status === "done") return "success";
  if (status === "fail" || status === "failed" || status === "error") return "fail";
  return "waiting";
}

function resolveUserId(req) {
  const raw = req.query && req.query.id;
  if (Array.isArray(raw)) return raw[0];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  const url = typeof req.url === "string" ? req.url : "";
  const match = url.match(/\/api\/admin\/users\/([^/?#]+)/i);
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { supabase } = await requireAdmin(req);
    const id = resolveUserId(req);
    if (!id) {
      res.status(400).json({ message: "User id required" });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, role, is_subscriber, credits, generation_count, created_at",
      )
      .eq("id", id)
      .single();

    if (profileError || !profile) {
      res.status(404).json({ message: "Utilisateur introuvable" });
      return;
    }

    const [generationsResult, ledgerResult] = await Promise.all([
      supabase
        .from("generations")
        .select(
          "id, user_id, template_id, generation_type, final_prompt, prompt, provider, status, fail_message, credit_cost, created_at, templates(name, template_categories(slug, name))",
        )
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("credit_ledger")
        .select(
          "id, generation_id, subscription_id, delta, balance_after, reason, metadata, created_at",
        )
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (generationsResult.error) throw generationsResult.error;
    if (ledgerResult.error) throw ledgerResult.error;

    const ledgerEntries = ledgerResult.data || [];
    const creditsByGeneration = new Map();

    for (const entry of ledgerEntries) {
      if (!entry.generation_id) continue;
      const existing = creditsByGeneration.get(entry.generation_id) || {
        charged: 0,
        refunded: 0,
      };
      if (entry.reason === "generation_charge" && entry.delta < 0) {
        existing.charged += Math.abs(entry.delta);
      }
      if (entry.reason === "refund" && entry.delta > 0) {
        existing.refunded += entry.delta;
      }
      creditsByGeneration.set(entry.generation_id, existing);
    }

    const generations = (generationsResult.data || []).map((row) => {
      const credits = creditsByGeneration.get(row.id) || {
        charged: 0,
        refunded: 0,
      };
      const template = row.templates;
      const category =
        (template &&
          template.template_categories &&
          (template.template_categories.slug ||
            template.template_categories.name)) ||
        null;

      return {
        id: row.id,
        generationType: row.generation_type,
        status: toClientStatus(row.status),
        finalPrompt: row.final_prompt,
        prompt: row.prompt,
        provider: row.provider,
        failMessage: row.fail_message,
        creditCost: row.credit_cost || 0,
        creditsCharged: credits.charged,
        creditsRefunded: credits.refunded,
        netCredits: credits.charged - credits.refunded,
        createdAt: row.created_at,
        template: template
          ? {
              name: template.name,
              nameEn: template.name_en || null,
              category,
            }
          : null,
      };
    });

    const totalCharged = ledgerEntries
      .filter((entry) => entry.reason === "generation_charge" && entry.delta < 0)
      .reduce((sum, entry) => sum + Math.abs(entry.delta), 0);
    const totalRefunded = ledgerEntries
      .filter((entry) => entry.reason === "refund" && entry.delta > 0)
      .reduce((sum, entry) => sum + entry.delta, 0);
    const subscriptionGranted = ledgerEntries
      .filter((entry) => entry.reason === "subscription_grant" && entry.delta > 0)
      .reduce((sum, entry) => sum + entry.delta, 0);
    const adminAdjustments = ledgerEntries
      .filter((entry) => entry.reason === "admin_adjustment")
      .reduce((sum, entry) => sum + entry.delta, 0);

    res.status(200).json({
      profile: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        isSubscriber: profile.is_subscriber,
        credits: profile.credits,
        generationCount: profile.generation_count,
        createdAt: profile.created_at,
      },
      summary: {
        generationCount: generations.length,
        failedGenerations: generations.filter((item) => item.status === "fail")
          .length,
        totalCharged,
        totalRefunded,
        netSpent: totalCharged - totalRefunded,
        subscriptionGranted,
        adminAdjustments,
      },
      generations,
      creditLedger: ledgerEntries.map((entry) => ({
        id: entry.id,
        generationId: entry.generation_id,
        subscriptionId: entry.subscription_id,
        delta: entry.delta,
        balanceAfter: entry.balance_after,
        reason: entry.reason,
        metadata: entry.metadata || {},
        createdAt: entry.created_at,
      })),
    });
  } catch (error) {
    console.error("admin user activity error", error);
    sendError(res, error);
  }
};
