const { requireUser, sendError } = require("../user-auth");
const { toAssetList, toClientStatus } = require("../generation");

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

function toLarpDto(row) {
  const template = row.templates;
  const category =
    template?.template_categories?.slug ||
    template?.category_slug ||
    template?.category ||
    null;

  return {
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id,
    generationType: row.generation_type,
    finalPrompt: row.final_prompt,
    providerTaskId: row.provider_task_id,
    status: toClientStatus(row.status),
    outputAssets: toAssetList(row.output_assets),
    watermarkedAssets: toAssetList(row.watermarked_assets),
    inputAssets: toAssetList(row.input_assets),
    failMessage: row.fail_message,
    costTime: row.cost_time == null ? null : Number(row.cost_time),
    aspectRatio: row.aspect_ratio,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    template: template
      ? {
          name: template.name,
          nameEn: template.name_en ?? null,
          category,
        }
      : null,
  };
}

function parsePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
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

    const limit = Math.min(
      Math.max(parsePositiveInt(req.query?.limit, DEFAULT_LIMIT), 1),
      MAX_LIMIT,
    );
    const offset = Math.max(parsePositiveInt(req.query?.offset, 0), 0);

    // Keep the select aligned with real columns: templates / categories
    // do not have name_en in this project schema.
    const { data, error, count } = await supabase
      .from("generations")
      .select("*, templates(name, template_categories(slug, name))", {
        count: "exact",
      })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const items = (data ?? []).map(toLarpDto);
    const total = typeof count === "number" ? count : offset + items.length;
    const nextOffset = offset + items.length;
    const hasMore = nextOffset < total;

    res.status(200).json({
      items,
      hasMore,
      nextOffset,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("larps history error", error);
    sendError(res, error);
  }
};
