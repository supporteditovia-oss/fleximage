/**
 * Inject brand WebSite/Organization JSON-LD into client/index.html
 * and refresh sitemap.xml so Vercel static hosting has crawlable SEO.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INDEX_HTML = path.join(ROOT, "client", "index.html");
const PUBLIC_DIR = path.join(ROOT, "client", "public");

// Prefer compiled-free inline JSON matching shared/site-seo.ts brand graph.
const ORIGIN = "https://www.luxeflexia.com";
const SITE_NAME = "LuxeFlexIA";
const ALTERNATE = [
  "Luxeflexia",
  "Luxe Flex IA",
  "LuxeFlexia",
  "luxeflexia.com",
  "www.luxeflexia.com",
];
const DESCRIPTION =
  "LuxeFlexIA (aussi écrit Luxeflexia) génère des photos de vous hyper-réalistes dans des décors de luxe grâce à l'intelligence artificielle. Site officiel : luxeflexia.com.";
const IMAGE = `${ORIGIN}/assets/og-image.png?v=20260725`;

const brandGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${ORIGIN}/#website`,
      name: SITE_NAME,
      alternateName: ALTERNATE,
      url: `${ORIGIN}/`,
      inLanguage: "fr-FR",
      description: DESCRIPTION,
      publisher: { "@id": `${ORIGIN}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${ORIGIN}/#organization`,
      name: SITE_NAME,
      legalName: SITE_NAME,
      alternateName: ALTERNATE,
      url: `${ORIGIN}/`,
      logo: { "@type": "ImageObject", url: IMAGE },
      description: DESCRIPTION,
      foundingDate: "2026",
      brand: {
        "@type": "Brand",
        name: SITE_NAME,
        alternateName: ALTERNATE,
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${ORIGIN}/#app`,
      name: SITE_NAME,
      alternateName: ALTERNATE,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      url: `${ORIGIN}/`,
      image: IMAGE,
      description: DESCRIPTION,
      offers: [
        {
          "@type": "Offer",
          name: "Abonnement LuxeFlexIA Discovery",
          price: "8.90",
          priceCurrency: "EUR",
        },
        {
          "@type": "Offer",
          name: "Abonnement LuxeFlexIA Essential",
          price: "19.90",
          priceCurrency: "EUR",
        },
        {
          "@type": "Offer",
          name: "Abonnement LuxeFlexIA Ultimate",
          price: "39.90",
          priceCurrency: "EUR",
        },
      ],
    },
  ],
};

const scriptTag = `<script type="application/ld+json">${JSON.stringify(brandGraph)}</script>`;

let html = fs.readFileSync(INDEX_HTML, "utf8");

// Keep title/description/keywords aligned with brand aliases.
html = html
  .replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>LuxeFlexIA (Luxeflexia) — Créateur de photos lifestyle par IA</title>`,
  )
  .replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${DESCRIPTION.replace(/"/g, "&quot;")}" />`,
  )
  .replace(
    /<meta name="keywords" content="[^"]*" \/>/,
    `<meta name="keywords" content="LuxeFlexIA, Luxeflexia, génération image IA, génération Dimash Lux, génération Dimash Prank, génération Watch Lux, génération restaurant, photo IA réaliste, générateur photo IA, prank IA TikTok, flex luxe IA" />`,
  )
  .replace(
    /content="LuxeFlexIA - Créateur de photos lifestyle par IA"/g,
    `content="LuxeFlexIA (Luxeflexia) — Créateur de photos lifestyle par IA"`,
  )
  .replace(
    /LuxeFlexIA génère des photos de vous hyper-réalistes dans des décors de luxe grâce à l'intelligence artificielle\./g,
    DESCRIPTION,
  )
  .replace(
    /og-image\.png\?v=\d+/g,
    "og-image.png?v=20260725",
  );

if (html.includes("<!-- SEO_STRUCTURED_DATA -->")) {
  html = html.replace("<!-- SEO_STRUCTURED_DATA -->", scriptTag);
} else if (html.includes('id="seo-brand-graph"')) {
  html = html.replace(
    /<script type="application\/ld\+json" id="seo-brand-graph">[\s\S]*?<\/script>/,
    `<script type="application/ld+json" id="seo-brand-graph">${JSON.stringify(brandGraph)}</script>`,
  );
} else {
  html = html.replace(
    "</head>",
    `    <script type="application/ld+json" id="seo-brand-graph">${JSON.stringify(brandGraph)}</script>\n  </head>`,
  );
}

// Make brand aliases explicit for crawlers in the crawlable fallback block.
if (!html.includes("aussi appelé Luxeflexia")) {
  html = html.replace(
    "<h1>LuxeFlexIA - Créateur de photos lifestyle par IA</h1>",
    "<h1>LuxeFlexIA (Luxeflexia) — Créateur de photos lifestyle par IA</h1>",
  );
  html = html.replace(
    "LuxeFlexIA permet de créer des images lifestyle crédibles en quelques secondes :",
    "LuxeFlexIA (aussi appelé Luxeflexia, site officiel luxeflexia.com) permet de créer des images lifestyle crédibles en quelques secondes :",
  );
}

fs.writeFileSync(INDEX_HTML, html, "utf8");
console.log("[seo:brand] injected brand JSON-LD + meta into client/index.html");

// Refresh public sitemap lastmod via existing generator.
const r = spawnSync(process.execPath, [path.join(__dirname, "generate-seo-static.mjs")], {
  cwd: ROOT,
  stdio: "inherit",
});
if (r.status !== 0) {
  console.warn("[seo:brand] generate-seo-static failed — writing minimal sitemap");
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = ["/", "/generate", "/pricing", "/cgu", "/confidentialite", "/tous-les-generateurs"];
  const body = urls
    .map(
      (p, i) => `  <url>
    <loc>${ORIGIN}${p === "/" ? "/" : p}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${i === 0 ? "1.0" : "0.8"}</priority>
  </url>`,
    )
    .join("\n");
  fs.writeFileSync(
    path.join(PUBLIC_DIR, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    "utf8",
  );
}

// IndexNow — submit all niche URLs (not only core pages).
const indexNow = spawnSync(
  process.execPath,
  [path.join(__dirname, "ping-indexnow.mjs")],
  { cwd: ROOT, stdio: "inherit" },
);
if (indexNow.status !== 0) {
  console.warn("[seo:brand] IndexNow ping failed");
}
