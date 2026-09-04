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

function nicheJsonLd(niche) {
  const url = `${ORIGIN}${nichePath(niche.slug)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: niche.metaTitle,
        description: niche.metaDescription,
        url,
      },
      {
        "@type": "FAQPage",
        mainEntity: (niche.faqs || []).map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: `${ORIGIN}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Générateurs",
            item: `${ORIGIN}${DIRECTORY_PATH}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: niche.h1,
            item: url,
          },
        ],
      },
    ],
  };
}

function nicheHtml({
  title,
  description,
  canonicalPath,
  h1,
  subtitle,
  intro,
  bullets,
  promptIdeas,
  faqs,
  searchPhrases,
  relatedLinks,
  jsonLd,
}) {
  const canonical = `${ORIGIN}${canonicalPath}`;
  const related = relatedLinks
    .map(
      (link) =>
        `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`,
    )
    .join("\n          ");
  const bulletList = (bullets || [])
    .map((b) => `<li>${escapeHtml(b)}</li>`)
    .join("\n          ");
  const prompts = (promptIdeas || [])
    .map((p) => `<li><code>${escapeHtml(p)}</code></li>`)
    .join("\n          ");
  const faqHtml = (faqs || [])
    .map(
      (faq) =>
        `<h3>${escapeHtml(faq.question)}</h3>\n      <p>${escapeHtml(faq.answer)}</p>`,
    )
    .join("\n      ");
  const phrases =
    searchPhrases && searchPhrases.length
      ? `<p>Recherches fréquentes : ${escapeHtml(searchPhrases.join(" · "))}.</p>`
      : "";

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
    <meta property="og:locale" content="fr_FR" />
    <meta property="og:image" content="${ORIGIN}/assets/og-image.png?v=20260720" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="LuxeFlexIA — créateur de photos lifestyle par IA" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    <style>
      body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: #f2f0ec; color: #12100e; line-height: 1.55; }
      main { max-width: 42rem; margin: 0 auto; padding: 3rem 1.25rem 4rem; }
      a { color: #8b6914; }
      h1 { font-size: clamp(1.6rem, 4vw, 2.2rem); line-height: 1.15; margin: 0 0 0.75rem; }
      h2 { margin-top: 2rem; font-size: 1.25rem; }
      h3 { margin-top: 1.25rem; font-size: 1.05rem; }
      .brand { font-size: 0.75rem; letter-spacing: 0.16em; text-transform: uppercase; color: #8b6914; font-weight: 700; }
      .sub { color: #5c564e; margin: 0 0 1.5rem; }
      .cta { display: inline-block; margin: 0.35rem 0.5rem 0.35rem 0; padding: 0.85rem 1.2rem; border-radius: 999px; background: linear-gradient(135deg, #e8c547, #c9a227 45%, #8b6914); color: #1a1408; text-decoration: none; font-weight: 700; font-family: system-ui, sans-serif; font-size: 0.9rem; }
      .ghost { background: #fff; border: 1px solid rgba(0,0,0,0.1); color: #12100e; }
      ul { padding-left: 1.1rem; }
      code { font-family: system-ui, sans-serif; font-size: 0.9rem; }
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
      <p>${escapeHtml(intro || "")}</p>
      ${bulletList ? `<h2>Pourquoi LuxeFlexIA</h2>\n      <ul>\n          ${bulletList}\n      </ul>` : ""}
      <h2>Comment ça marche</h2>
      <ol>
        <li>Uploadez une photo claire de vous.</li>
        <li>Décrivez la scène ou collez un prompt.</li>
        <li>Générez une image IA hyper-réaliste en quelques secondes.</li>
      </ol>
      ${prompts ? `<h2>Idées de prompts</h2>\n      <ul>\n          ${prompts}\n      </ul>` : ""}
      ${faqHtml ? `<h2>Questions fréquentes</h2>\n      ${faqHtml}` : ""}
      ${phrases}
      <p><a href="${DIRECTORY_PATH}">← Tous nos générateurs (Dimash, Watch Lux, pranks, luxe)</a></p>
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
    "Tous nos générateurs IA (Dimash Lux, Watch Lux, Pranks) — LuxeFlexIA";
  const description =
    "Annuaire LuxeFlexIA : génération image IA, Dimash Lux, Watch Lux, restaurant, pranks TikTok, voiture de luxe et flex lifestyle.";
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
      <h1>Tous nos générateurs IA (Dimash, Watch Lux, Pranks, Luxe)</h1>
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
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/generate", priority: "0.9", changefreq: "weekly" },
    { path: "/pricing", priority: "0.8", changefreq: "weekly" },
    { path: "/cgu", priority: "0.3", changefreq: "yearly" },
    { path: "/confidentialite", priority: "0.3", changefreq: "yearly" },
    { path: DIRECTORY_PATH, priority: "0.9", changefreq: "daily" },
  ];

  const urls = [
    ...staticPages,
    ...niches.map((niche) => ({
      path: nichePath(niche.slug),
      priority: "0.8",
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

writeFile(path.join(PUBLIC_DIR, "sitemap.xml"), buildSitemap());

console.log(`SEO sitemap generated (${niches.length} niche URLs, SPA serves page content)`);
