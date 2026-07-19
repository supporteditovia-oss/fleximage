/**
 * Generates crawlable static HTML for programmatic SEO niches + sitemap.xml.
 * Run before Vite build so Vercel serves real HTML to Googlebot.
 */
import fs from "node:fs";
import path from "node:path";
import {
  SEO_DIRECTORY_PATH,
  SEO_NICHE_CATEGORIES,
  SEO_NICHES,
  getSeoNichePath,
  getSeoNichesByCategory,
} from "../shared/seo-niches";
import { DEFAULT_SITE_ORIGIN, buildSitemapXml } from "../shared/site-seo";

const PUBLIC_DIR = path.resolve("client/public");

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function writeFile(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
}

function nicheHtml(options: {
  title: string;
  description: string;
  canonicalPath: string;
  h1: string;
  subtitle: string;
  relatedLinks: Array<{ href: string; label: string }>;
}): string {
  const canonical = `${DEFAULT_SITE_ORIGIN}${options.canonicalPath}`;
  const related = options.relatedLinks
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
    <title>${escapeHtml(options.title)}</title>
    <meta name="description" content="${escapeHtml(options.description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:title" content="${escapeHtml(options.title)}" />
    <meta property="og:description" content="${escapeHtml(options.description)}" />
    <meta property="og:site_name" content="LuxeFlexIA" />
    <meta property="og:image" content="${DEFAULT_SITE_ORIGIN}/assets/og-image.png" />
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
      <h1>${escapeHtml(options.h1)}</h1>
      <p class="sub">${escapeHtml(options.subtitle)}</p>
      <p>
        <a class="cta" href="/register">Créer ma photo maintenant</a>
        <a class="cta ghost" href="/generate">Ouvrir le générateur</a>
      </p>
      <p><a href="${SEO_DIRECTORY_PATH}">← Tous nos générateurs (Pranks, Luxe, Voyage)</a></p>
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

function directoryHtml(): string {
  const sections = SEO_NICHE_CATEGORIES.map((category) => {
    const niches = getSeoNichesByCategory(category.id);
    const items = niches
      .map(
        (niche) =>
          `<li><a href="${getSeoNichePath(niche.slug)}">${escapeHtml(niche.h1)}</a></li>`,
      )
      .join("\n        ");
    return `<section>
      <h2>${escapeHtml(category.label)}</h2>
      <p>${escapeHtml(category.description)}</p>
      <ul>
        ${items}
      </ul>
    </section>`;
  }).join("\n    ");

  const title =
    "Tous nos générateurs IA (Pranks, Luxe, Voyage) — LuxeFlexIA";
  const description =
    "Annuaire LuxeFlexIA : générateurs de photos IA pour voitures de luxe, voyages, restaurants, pranks et flex lifestyle.";
  const canonical = `${DEFAULT_SITE_ORIGIN}${SEO_DIRECTORY_PATH}`;

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

function main(): void {
  for (const niche of SEO_NICHES) {
    const related = SEO_NICHES.filter(
      (item) =>
        item.categoryId === niche.categoryId && item.slug !== niche.slug,
    )
      .slice(0, 4)
      .map((item) => ({
        href: getSeoNichePath(item.slug),
        label: item.h1,
      }));

    const out = path.join(
      PUBLIC_DIR,
      "generateur",
      niche.slug,
      "index.html",
    );
    writeFile(
      out,
      nicheHtml({
        title: niche.metaTitle,
        description: niche.metaDescription,
        canonicalPath: getSeoNichePath(niche.slug),
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

  writeFile(
    path.join(PUBLIC_DIR, "sitemap.xml"),
    buildSitemapXml(DEFAULT_SITE_ORIGIN),
  );

  console.log(
    `SEO static pages generated: ${SEO_NICHES.length} niches + directory + sitemap`,
  );
}

main();
