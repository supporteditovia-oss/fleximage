/**
 * Generates crawlable static HTML for programmatic SEO niches + sitemap.xml.
 * Pure Node ESM — no TypeScript loader required on Vercel.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "client", "public");
const DATA_PATH = path.join(ROOT, "shared", "seo-niches.json");
const ORIGIN = "https://www.luxeflexia.com";
const DIRECTORY_PATH = "/tous-les-generateurs";

const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const categories = data.categories;
const niches = data.niches;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeXml(value) {
  return escapeHtml(value).replace(/'/g, "&apos;");
}

function nichePath(slug) {
  return `/generateur/${slug}`;
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
}

function nicheHtml({ title, description, canonicalPath, h1, subtitle, relatedLinks }) {
  const canonical = `${ORIGIN}${canonicalPath}`;
  const related = relatedLinks
    .map(
      (link) =>
        `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`,
    )
    .join("\n          ");

  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:site_name" content="LuxeFlexIA" />
    <meta property="og:image" content="${ORIGIN}/assets/og-image.png?v=20260720" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="LuxeFlexIA — créateur de photos lifestyle par IA" />
    <style>
      body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: #f2f0ec; color: #12100e; line-height: 1.55; }
      main { max-width: 42rem; margin: 0 auto; padding: 3rem 1.25rem 4rem; }
      a { color: #8b6914; }
      h1 { font-size: clamp(1.6rem, 4vw, 2.2rem); line-height: 1.15; margin: 0 0 0.75rem; }
      .brand { font-size: 0.75rem; letter-spacing: 0.16em; text-transform: uppercase; color: #8b6914; font-weight: 700; }
      .sub { color: #5c564e; margin: 0 0 1.5rem; }
      .cta { display: inline-block; margin: 0.35rem 0.5rem 0.35rem 0; padding: 0.85rem 1.2rem; border-radius: 999px; background: linear-gradient(135deg, #e8c547, #c9a227 45%, #8b6914); color: #1a1408; text-decoration: none; font-weight: 700; font-family: system-ui, sans-serif; font-size: 0.9rem; }
      .ghost { background: #fff; border: 1px solid rgba(0,0,0,0.1); color: #12100e; }
      ul { padding-left: 1.1rem; }
    </style>
  </head>
  <body>
    <main>
      <p class="brand">LuxeFlexIA</p>
      <h1>${escapeHtml(h1)}</h1>
      <p class="sub">${escapeHtml(subtitle)}</p>
      <p>
        <a class="cta" href="/register">Créer ma photo maintenant</a>
        <a class="cta ghost" href="/generate">Ouvrir le générateur</a>
      </p>
      <p><a href="${DIRECTORY_PATH}">← Tous nos générateurs (Pranks, Luxe, Voyage)</a></p>
      ${
        related
          ? `<h2>Idées proches</h2>
      <ul>
          ${related}
      </ul>`
          : ""
      }
      <p><a href="/">Retour à l'accueil LuxeFlexIA</a></p>
    </main>
  </body>
</html>
`;
}

function directoryHtml() {
  const sections = categories
    .map((category) => {
      const items = niches
        .filter((niche) => niche.categoryId === category.id)
        .map(
          (niche) =>
            `<li><a href="${nichePath(niche.slug)}">${escapeHtml(niche.h1)}</a></li>`,
        )
        .join("\n        ");
      return `<section>
      <h2>${escapeHtml(category.label)}</h2>
      <p>${escapeHtml(category.description)}</p>
      <ul>
        ${items}
      </ul>
    </section>`;
    })
    .join("\n    ");

  const title =
    "Tous nos générateurs IA (Pranks, Luxe, Voyage) — LuxeFlexIA";
  const description =
    "Annuaire LuxeFlexIA : générateurs de photos IA pour voitures de luxe, voyages, restaurants, pranks et flex lifestyle.";
  const canonical = `${ORIGIN}${DIRECTORY_PATH}`;

  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:site_name" content="LuxeFlexIA" />
    <style>
      body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: #f2f0ec; color: #12100e; line-height: 1.55; }
      main { max-width: 48rem; margin: 0 auto; padding: 3rem 1.25rem 4rem; }
      a { color: #8b6914; }
      h1 { font-size: clamp(1.7rem, 4vw, 2.4rem); }
      h2 { margin-top: 2rem; }
    </style>
  </head>
  <body>
    <main>
      <p><a href="/">← Accueil LuxeFlexIA</a></p>
      <h1>Tous nos générateurs (Pranks, Luxe, Voyage)</h1>
      <p>${escapeHtml(description)}</p>
      ${sections}
    </main>
  </body>
</html>
`;
}

function buildSitemap() {
  const lastmod = new Date().toISOString().slice(0, 10);
  const staticPages = [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/generate", priority: "0.8", changefreq: "weekly" },
    { path: "/pricing", priority: "0.8", changefreq: "weekly" },
    { path: "/cgu", priority: "0.3", changefreq: "yearly" },
    { path: "/confidentialite", priority: "0.3", changefreq: "yearly" },
    { path: DIRECTORY_PATH, priority: "0.7", changefreq: "weekly" },
  ];

  const urls = [
    ...staticPages,
    ...niches.map((niche) => ({
      path: nichePath(niche.slug),
      priority: "0.7",
      changefreq: "weekly",
    })),
  ]
    .map((entry) => {
      const loc = `${ORIGIN}${entry.path === "/" ? "/" : entry.path}`;
      return [
        "  <url>",
        `    <loc>${escapeXml(loc)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

for (const niche of niches) {
  const related = niches
    .filter(
      (item) =>
        item.categoryId === niche.categoryId && item.slug !== niche.slug,
    )
    .slice(0, 4)
    .map((item) => ({
      href: nichePath(item.slug),
      label: item.h1,
    }));

  writeFile(
    path.join(PUBLIC_DIR, "generateur", niche.slug, "index.html"),
    nicheHtml({
      title: niche.metaTitle,
      description: niche.metaDescription,
      canonicalPath: nichePath(niche.slug),
      h1: niche.h1,
      subtitle: niche.heroSubtitle,
      relatedLinks: related,
    }),
  );
}

writeFile(
  path.join(PUBLIC_DIR, "tous-les-generateurs", "index.html"),
  directoryHtml(),
);
writeFile(path.join(PUBLIC_DIR, "sitemap.xml"), buildSitemap());

console.log(
  `SEO static pages generated: ${niches.length} niches + directory + sitemap`,
);
