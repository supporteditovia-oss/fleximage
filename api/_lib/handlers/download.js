const { requireUser, sendError } = require("../user-auth");

function toAssetList(value) {
  if (Array.isArray(value)) return value.filter((u) => typeof u === "string");
  return [];
}

function inferDownloadMeta(url, contentTypeHeader, generationType) {
  const header = (contentTypeHeader || "").toLowerCase();
  if (header.includes("video/") || generationType === "video") {
    if (header.includes("webm") || /\.webm(\?|#|$)/i.test(url)) {
      return { contentType: "video/webm", extension: "webm" };
    }
    return { contentType: "video/mp4", extension: "mp4" };
  }
  if (header.includes("png") || /\.png(\?|#|$)/i.test(url)) {
    return { contentType: "image/png", extension: "png" };
  }
  if (header.includes("webp") || /\.webp(\?|#|$)/i.test(url)) {
    return { contentType: "image/webp", extension: "webp" };
  }
  return { contentType: "image/jpeg", extension: "jpg" };
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
    const { supabase, userId } = await requireUser(req);
    const larpId = req.query.larpId;
    const imageIndex = req.query.imageIndex;
    const index = Number.parseInt(String(imageIndex), 10);

    if (!larpId || typeof larpId !== "string") {
      res.status(400).json({ message: "larpId requis" });
      return;
    }
    if (!Number.isInteger(index) || index < 0) {
      res.status(400).json({ message: "Index image invalide" });
      return;
    }

    const { data: larp, error } = await supabase
      .from("generations")
      .select("output_assets, watermarked_assets, generation_type")
      .eq("id", larpId)
      .eq("user_id", userId)
      .single();

    if (error || !larp) {
      res.status(404).json({ message: "Génération introuvable" });
      return;
    }

    const originals = toAssetList(larp.output_assets);
    const watermarked = toAssetList(larp.watermarked_assets);

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_subscriber, role")
      .eq("id", userId)
      .single();
    const isSubscriber = Boolean(
      profile?.is_subscriber || profile?.role === "admin",
    );

    const urls =
      !isSubscriber && watermarked.length > 0
        ? watermarked
        : originals.length > 0
          ? originals
          : watermarked;

    if (urls.length === 0) {
      res.status(404).json({ message: "Génération introuvable" });
      return;
    }

    if (index >= urls.length) {
      res.status(404).json({ message: "Image introuvable" });
      return;
    }

    const assetUrl = urls[index];
    const assetResponse = await fetch(assetUrl);
    if (!assetResponse.ok) {
      console.error("download upstream failed", assetResponse.status, assetUrl);
      res.status(502).json({ message: "Impossible de récupérer le fichier" });
      return;
    }

    const generationType =
      larp.generation_type === "video" ? "video" : "image";
    const { contentType, extension } = inferDownloadMeta(
      assetUrl,
      assetResponse.headers.get("content-type"),
      generationType,
    );
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const buffer = Buffer.from(await assetResponse.arrayBuffer());

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="larp-${randomSuffix}.${extension}"`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Length", String(buffer.length));
    res.end(buffer);
  } catch (error) {
    console.error("larp download error", error);
    sendError(res, error);
  }
};
