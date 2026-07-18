/** Canonical public site origin (no trailing slash). */
export const DEFAULT_SITE_ORIGIN = "https://www.luxeflexia.com";

export const SITE_NAME = "LuxeFlexIA";
export const SITE_TITLE = "LuxeFlexIA - Cree des LARPs ultra realistes avec l'IA";
export const SITE_DESCRIPTION =
  "Genere des contenus LARP ultra realistes en quelques secondes avec l'IA. Ajoute une photo, decris une scene, et cree des images lifestyle credibles pour t'amuser.";
export const SITE_OG_IMAGE = "/assets/og-image.png";

export const FAQ_STRUCTURED_DATA = [
  {
    question: "C'est quoi LuxeFlexIA ?",
    answer:
      "LuxeFlexIA est un outil IA pour generer des contenus LARP hyper realistes en quelques secondes. Ajoute ta photo, decris ton idee, et l'IA fait le reste.",
  },
  {
    question: "Les images generees sont-elles realistes ?",
    answer:
      "Oui. LuxeFlexIA est concu pour produire des scenes visuelles credibles a partir d'une image de reference et d'une idee de mise en scene.",
  },
  {
    question: "Quel type de LARPs peut-on creer ?",
    answer:
      "Tu peux creer des scenes de voyage, restaurant haut de gamme, lifestyle premium, achat luxe, supercar, travail ou storytelling social.",
  },
  {
    question: "LuxeFlexIA est-il fait pour un usage responsable ?",
    answer:
      "Oui. LuxeFlexIA est destine au divertissement entre proches. Le harcelement, la diffamation, la fraude et les usages malveillants sont interdits.",
  },
] as const;

export const INDEXABLE_SITE_PAGES = [
  {
    path: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    changefreq: "weekly" as const,
    priority: "1.0",
    images: [
      {
        loc: SITE_OG_IMAGE,
        title: "LuxeFlexIA - generateur de contenus LARP realistes",
      },
    ],
  },
] as const;

/** Legal pages: noindex in HTML/headers; omitted from sitemap.xml. */
export const LEGAL_NOINDEX_PATHS = [
  "/mentions-legales",
  "/cgu",
  "/cgv",
  "/confidentialite",
] as const;

export type LegalNoindexPath = (typeof LEGAL_NOINDEX_PATHS)[number];

export const APP_NOINDEX_PATHS = [
  "/admin",
  "/admin/users",
  "/admin/templates",
  "/admin/logs",
  "/admin/studio",
  "/app",
  "/generate",
  "/history",
  "/historique",
  "/resultat",
  "/mon-resultat",
  "/settings",
  "/login",
  "/register",
  "/debug-generate",
  "/face-capture",
] as const;

export const NOINDEX_SITE_PATHS = [
  ...APP_NOINDEX_PATHS,
  ...LEGAL_NOINDEX_PATHS,
] as const;

/** Robots.txt is for crawl control. noindex paths stay crawlable so bots can see X-Robots-Tag. */
export const ROBOTS_DISALLOW_PATHS = [
  "/api/",
] as const;

export const SITEMAP_ENTRIES = INDEXABLE_SITE_PAGES;

const NON_PUBLIC_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** True when origin is suitable for sitemap.xml / robots.txt (never localhost). */
export function isPublicSiteOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    if (NON_PUBLIC_HOSTS.has(hostname)) return false;
    if (hostname.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

/** Canonical origin for SEO files — always production URL unless SITE_URL is public. */
export function resolveSiteOrigin(envOrigin?: string | null): string {
  const raw = (envOrigin?.trim() || DEFAULT_SITE_ORIGIN).replace(/\/$/, "");
  try {
    const origin = new URL(raw.includes("://") ? raw : `https://${raw}`).origin;
    return isPublicSiteOrigin(origin) ? origin : DEFAULT_SITE_ORIGIN;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

export function normalizeSitePathname(pathname: string): string {
  const raw = pathname.split("?")[0]?.split("#")[0] || "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const withoutTrailingSlash =
    withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
  return withoutTrailingSlash || "/";
}

export function isIndexableSitePath(pathname: string): boolean {
  const normalized = normalizeSitePathname(pathname);
  return INDEXABLE_SITE_PAGES.some((page) => page.path === normalized);
}

export function isKnownSitePath(pathname: string): boolean {
  const normalized = normalizeSitePathname(pathname);
  return (
    isIndexableSitePath(normalized) ||
    (NOINDEX_SITE_PATHS as readonly string[]).includes(normalized)
  );
}

export function getSeoPageMeta(pathname: string): (typeof INDEXABLE_SITE_PAGES)[number] {
  const normalized = normalizeSitePathname(pathname);
  return (
    INDEXABLE_SITE_PAGES.find((page) => page.path === normalized) ??
    INDEXABLE_SITE_PAGES[0]
  );
}

export function buildRobotsTxt(origin: string): string {
  const disallowLines = ROBOTS_DISALLOW_PATHS.map(
    (path) => `Disallow: ${path}`,
  ).join("\n");

  return [
    `# ${origin}/robots.txt`,
    "",
    "User-agent: *",
    "Allow: /",
    "",
    disallowLines,
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absoluteUrl(origin: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${origin}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function buildSitemapXml(origin: string): string {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = SITEMAP_ENTRIES.map((entry) => {
    const loc = `${origin}${entry.path === "/" ? "/" : entry.path}`;
    const images = (entry.images || []).map((image) =>
      [
        "    <image:image>",
        `      <image:loc>${escapeXml(absoluteUrl(origin, image.loc))}</image:loc>`,
        `      <image:title>${escapeXml(image.title)}</image:title>`,
        "    </image:image>",
      ].join("\n"),
    );

    return [
      "  <url>",
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${entry.changefreq}</changefreq>`,
      `    <priority>${entry.priority}</priority>`,
      ...images,
      "  </url>",
    ].join("\n");
  }).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

export function buildStructuredData(origin: string) {
  const homeUrl = `${origin}/`;
  const imageUrl = absoluteUrl(origin, SITE_OG_IMAGE);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${homeUrl}#website`,
        name: SITE_NAME,
        url: homeUrl,
        inLanguage: "fr-FR",
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "Organization",
        "@id": `${homeUrl}#organization`,
        name: SITE_NAME,
        url: homeUrl,
        logo: imageUrl,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${homeUrl}#app`,
        name: SITE_NAME,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        url: homeUrl,
        image: imageUrl,
        description: SITE_DESCRIPTION,
        offers: [
          {
            "@type": "Offer",
            name: "Decouverte",
            price: "8.90",
            priceCurrency: "EUR",
          },
          {
            "@type": "Offer",
            name: "Essentiel",
            price: "19.90",
            priceCurrency: "EUR",
          },
          {
            "@type": "Offer",
            name: "Ultimate",
            price: "39.90",
            priceCurrency: "EUR",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${homeUrl}#faq`,
        mainEntity: FAQ_STRUCTURED_DATA.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };
}

export function buildStructuredDataScript(origin: string): string {
  return `<script type="application/ld+json">${JSON.stringify(buildStructuredData(origin))}</script>`;
}

export function isLegalNoindexPath(pathname: string): boolean {
  return (LEGAL_NOINDEX_PATHS as readonly string[]).includes(pathname);
}
