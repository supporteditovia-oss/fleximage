const { requireUser, sendError } = require("../user-auth");
const { toAssetList, toClientStatus } = require("../generation");

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

    // Keep the select aligned with real columns: templates / categories
    // do not have name_en in this project schema.
    const { data, error } = await supabase
      .from("generations")
      .select("*, templates(name, template_categories(slug, name))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    res.status(200).json((data ?? []).map(toLarpDto));
  } catch (error) {
    console.error("larps history error", error);
    sendError(res, error);
  }
};
