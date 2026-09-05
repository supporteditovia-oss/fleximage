const { requireUser } = require("../user-auth");
const { listBuiltinTemplatesForApi } = require("../builtin-image-templates");

/**
 * Liste des modèles proposés à l'utilisateur.
 *
 * Lecture seule : la création et l'édition restent côté admin. On ne renvoie
 * que les modèles actifs possédant au moins une image de référence, sinon le
 * bouton « Générer » mènerait à une impasse.
 */
module.exports = async function templatesHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { supabase } = await requireUser(req);

    const { data: templates, error } = await supabase
      .from("templates")
      .select(
        "id, slug, name, name_en, description, category_id, example_after_url, cover_url, icon, keywords, display_order, is_featured, generation_type",
      )
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const ids = (templates || []).map((t) => t.id);
    if (ids.length === 0) {
      res.status(200).json({ templates: listBuiltinTemplatesForApi() });
      return;
    }

    const [{ data: refs, error: refsError }, { data: categories }] =
      await Promise.all([
        supabase
          .from("template_reference_images")
          .select("template_id, requires_face_asset")
          .in("template_id", ids),
        supabase
          .from("template_categories")
          .select("id, slug, name")
          .eq("is_active", true),
      ]);

    if (refsError) {
      console.warn("templates refs unavailable, using built-in catalog only", refsError);
      res.status(200).json({ templates: listBuiltinTemplatesForApi() });
      return;
    }

    const counts = new Map();
    const faceOptional = new Map();
    for (const row of refs || []) {
      counts.set(row.template_id, (counts.get(row.template_id) || 0) + 1);
      if (row.requires_face_asset === false) {
        faceOptional.set(row.template_id, true);
      }
    }

    const categoryById = new Map(
      (categories || []).map((c) => [c.id, { slug: c.slug, name: c.name }]),
    );

    const payload = (templates || [])
      .filter((t) => (counts.get(t.id) || 0) > 0)
      .map((t) => {
        const category = categoryById.get(t.category_id) || null;
        return {
          id: t.id,
          slug: t.slug,
          name: t.name,
          nameEn: t.name_en,
          description: t.description,
          previewUrl: t.example_after_url || t.cover_url || null,
          icon: t.icon,
          keywords: t.keywords || [],
          isFeatured: t.is_featured,
          generationType: t.generation_type,
          category: category?.slug || null,
          categoryName: category?.name || null,
          referenceImageCount: counts.get(t.id) || 0,
          /** Une photo de l'utilisateur est-elle obligatoire ? */
          requiresUserPhoto: !faceOptional.get(t.id),
        };
      });

    res.status(200).json({ templates: [...listBuiltinTemplatesForApi(), ...payload] });
  } catch (error) {
    console.error("templates list error", error);
    res.status(200).json({ templates: listBuiltinTemplatesForApi() });
  }
};
