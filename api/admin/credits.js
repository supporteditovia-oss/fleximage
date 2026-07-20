const { requireAdmin, readBody, sendError } = require("../_lib/admin-auth");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { supabase, adminUserId } = await requireAdmin(req);
    const body = readBody(req);
    const userId = body.user_id;
    const amount = Number(body.amount);

    if (!userId || !Number.isInteger(amount) || amount < 1) {
      res.status(400).json({ message: "user_id et amount (>0) requis" });
      return;
    }

    const { data, error } = await supabase.rpc("apply_credit_delta", {
      p_user_id: userId,
      p_delta: amount,
      p_reason: "admin_adjustment",
      p_generation_id: null,
      p_subscription_id: null,
      p_idempotency_key: `admin:${adminUserId}:${userId}:${Date.now()}`,
      p_metadata: {
        source: "admin_credit_adjustment",
        admin_user_id: adminUserId,
      },
    });

    if (error) throw error;

    res.status(200).json({
      message: `${amount} jetons ajoutés`,
      credits: data,
    });
  } catch (error) {
    console.error("admin credits error", error);
    sendError(res, error);
  }
};
