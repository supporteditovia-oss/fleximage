const crypto = require("crypto");
const { getSupabaseAdmin } = require("../../user-auth");
const { extractPoyoVideoUrl, mapPoyoStatusToInternal } = require("../../car-video-transform/poyo-client");
const { downloadAndStoreVideo } = require("../../r2");
const { refundCarVideoCreditsIfCharged } = require("../../car-video-transform/credits");

function verifyPoyoWebhook(req, rawBody) {
  const secret = String(process.env.POYO_WEBHOOK_SECRET || "").trim();
  if (!secret) return true;
  const signature = String(
    req.headers["x-poyo-signature"] || req.headers["x-webhook-signature"] || "",
  ).trim();
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return signature === expected;
  }
}

module.exports = async function carVideoPoyoWebhookHandler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const rawBody =
    typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body || {});

  if (!verifyPoyoWebhook(req, rawBody)) {
    res.status(401).json({ message: "Signature webhook invalide" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ message: "Payload invalide" });
    return;
  }

  const taskId =
    payload?.data?.task_id ||
    payload?.task_id ||
    payload?.taskId ||
    null;
  if (!taskId) {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: row } = await supabase
    .from("car_video_generations")
    .select("*")
    .eq("poyo_task_id", taskId)
    .maybeSingle();

  if (!row) {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  if (row.status === "completed" || row.status === "failed") {
    res.status(200).json({ ok: true, idempotent: true });
    return;
  }

  const data = payload.data || payload;
  const internal = mapPoyoStatusToInternal(data.status);
  const patch = { updated_at: new Date().toISOString() };

  if (internal === "completed") {
    const remoteUrl = extractPoyoVideoUrl(data);
    let outputUrl = remoteUrl;
    if (remoteUrl) {
      try {
        const stored = await downloadAndStoreVideo(row.id, remoteUrl);
        if (stored?.[0]) outputUrl = stored[0];
      } catch (err) {
        console.error("[car-video webhook] store failed", err.message);
      }
    }
    patch.status = "completed";
    patch.output_video_url = outputUrl;
    patch.completed_at = new Date().toISOString();
  } else if (internal === "failed") {
    patch.status = "failed";
    patch.error_code = "POYO_FAILED";
    patch.error_message = data.error_message || "Échec PoYo";
    patch.completed_at = new Date().toISOString();
    await refundCarVideoCreditsIfCharged(supabase, {
      userId: row.user_id,
      generationId: row.id,
      reason: "poyo_webhook_failed",
    });
  } else {
    patch.status = internal === "queued" ? "queued" : "processing";
  }

  await supabase.from("car_video_generations").update(patch).eq("id", row.id);
  res.status(200).json({ ok: true });
};
