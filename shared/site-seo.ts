import {
  getSeoNicheBySlug,
  getSeoNichePath,
  parseSeoNicheSlugFromPath,
  SEO_DIRECTORY_PATH,
  SEO_NICHES,
} from "./seo-niches";

/** Canonical public site origin (no trailing slash). */
export const DEFAULT_SITE_ORIGIN = "https://www.luxeflexia.com";

export const SITE_NAME = "LuxeFlexIA";
export const SITE_TITLE = "LuxeFlexIA - Créateur de photos lifestyle par IA";
export const SITE_DESCRIPTION =
  "LuxeFlexIA génère des photos de vous hyper-réalistes dans des décors de luxe grâce à l'intelligence artificielle.";
export const SITE_OG_IMAGE = "/assets/og-image.png?v=20260720";

export type SitemapEntry = {
  path: string;
  title: string;
  description: string;
  changefreq: "weekly" | "yearly" | "monthly" | "daily";
  priority: string;
  images: Array<{ loc: string; title: string }>;
};

export const FAQ_STRUCTURED_DATA = [
  {
    question: "C'est quoi LuxeFlexIA ?",
    answer:
      "LuxeFlexIA est un outil IA pour generer des photos lifestyle hyper realistes en quelques secondes. Ajoute ta photo, decris ton idee, et l'IA fait le reste.",
  },
  {
    question: "Les images generees sont-elles realistes ?",
    answer:
      "Oui. LuxeFlexIA est concu pour produire des scenes visuelles credibles a partir d'une image de reference et d'une idee de mise en scene.",
  },
  {
    question: "Quel type de photos peut-on creer ?",
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
        title: "LuxeFlexIA - Créateur de photos lifestyle par IA",
      },
    ],
  },
  {
    path: "/generate",
    title: "Créer une image — LuxeFlexIA",
    description:
      "Créez des photos lifestyle hyper-réalistes avec LuxeFlexIA : uploadez une photo et générez votre scène de luxe.",
    changefreq: "weekly" as const,
    priority: "0.8",
    images: [],
  },
  {
    path: "/pricing",
    title: "Tarifs — LuxeFlexIA",
    description:
      "Découvrez les abonnements LuxeFlexIA : Discovery, Essential et Ultimate pour générer vos photos lifestyle par IA.",
    changefreq: "weekly" as const,
    priority: "0.8",
    images: [],
  },
  {
    path: "/cgu",
    title: "Conditions Generales d'Utilisation — LuxeFlexIA",
    description:
      "Conditions Generales d'Utilisation du service LuxeFlexIA (luxeflexia.com).",
    changefreq: "yearly" as const,
    priority: "0.3",
    images: [],
  },
  {
    path: "/confidentialite",
    title: "Politique de Confidentialite — LuxeFlexIA",
    description:
      "Politique de confidentialite de LuxeFlexIA : donnees collectees, finalites et droits.",
    changefreq: "yearly" as const,
    priority: "0.3",
    images: [],
  },
  {
    path: SEO_DIRECTORY_PATH,
    title: "Tous nos générateurs IA (Pranks, Luxe, Voyage) — LuxeFlexIA",
    description:
      "Annuaire LuxeFlexIA : générateurs de photos IA pour voitures de luxe, voyages, restaurants, pranks et flex lifestyle.",
    changefreq: "weekly" as const,
    priority: "0.7",
    images: [],
  },
] as const;

/** Legal pages that stay noindex (not used for Google OAuth branding). */
export const LEGAL_NOINDEX_PATHS = [
  "/mentions-legales",
  "/cgv",
] as const;

/** Legal pages Google OAuth branding must be able to crawl. */
export const LEGAL_PUBLIC_PATHS = ["/cgu", "/confidentialite"] as const;

export type LegalNoindexPath = (typeof LEGAL_NOINDEX_PATHS)[number];

export const APP_NOINDEX_PATHS = [
  "/admin",
  "/admin/users",
  "/admin/templates",
  "/admin/logs",
  "/admin/studio",
  "/app",
  "/history",
  "/historique",
  "/resultat",
  "/mon-resultat",
  "/settings",
  "/login",
  "/register",
  "/debug-generate",
] as const;

export const NOINDEX_SITE_PATHS = [
  ...APP_NOINDEX_PATHS,
  ...LEGAL_NOINDEX_PATHS,
] as const;

/** Robots.txt is for crawl control. noindex paths stay crawlable so bots can see X-Robots-Tag. */
export const ROBOTS_DISALLOW_PATHS = [] as const;

export const SITEMAP_ENTRIES = INDEXABLE_SITE_PAGES;

export function getSitemapEntries(): SitemapEntry[] {
  const nicheEntries: SitemapEntry[] = SEO_NICHES.map((niche) => ({
    path: getSeoNichePath(niche.slug),
    title: niche.metaTitle,
    description: niche.metaDescription,
    changefreq: "weekly",
    priority: "0.7",
    images: [],
  }));

  return [
    ...(INDEXABLE_SITE_PAGES as unknown as SitemapEntry[]),
    ...nicheEntries,
  ];
}

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

/**
 * Public app origin for OAuth / Stripe / emails.
 * Never returns localhost in production — always luxeflexia.com.
 */
export function resolvePublicAppUrl(
  ...candidates: Array<string | null | undefined>
): string {
  const allowLocal =
    typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

  for (const candidate of candidates) {
    const raw = candidate?.toString().trim().replace(/\/$/, "");
    if (!raw) continue;
    try {
      const origin = new URL(raw.includes("://") ? raw : `https://${raw}`).origin;
      if (isPublicSiteOrigin(origin)) return origin;
      if (allowLocal && !isPublicSiteOrigin(origin)) return origin;
    } catch {
      // try next candidate
    }
  }

  return DEFAULT_SITE_ORIGIN;
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
  if (INDEXABLE_SITE_PAGES.some((page) => page.path === normalized)) {
    return true;
  }
  const nicheSlug = parseSeoNicheSlugFromPath(normalized);
  return Boolean(nicheSlug && getSeoNicheBySlug(nicheSlug));
}

export function isKnownSitePath(pathname: string): boolean {
  const normalized = normalizeSitePathname(pathname);
  return (
    isIndexableSitePath(normalized) ||
    (NOINDEX_SITE_PATHS as readonly string[]).includes(normalized)
  );
}

export function getSeoPageMeta(pathname: string): SitemapEntry {
  const normalized = normalizeSitePathname(pathname);
  const nicheSlug = parseSeoNicheSlugFromPath(normalized);
  if (nicheSlug) {
    const niche = getSeoNicheBySlug(nicheSlug);
    if (niche) {
      return {
        path: getSeoNichePath(niche.slug),
        title: niche.metaTitle,
        description: niche.metaDescription,
        changefreq: "weekly",
        priority: "0.7",
        images: [],
      };
    }
  }

  return (
    (INDEXABLE_SITE_PAGES.find((page) => page.path === normalized) as
      | SitemapEntry
      | undefined) ?? (INDEXABLE_SITE_PAGES[0] as unknown as SitemapEntry)
  );
}

export function buildRobotsTxt(origin: string): string {
  const lines = [
    `# ${origin}/robots.txt`,
    "",
    "User-agent: *",
    "Allow: /",
  ];

  for (const path of ROBOTS_DISALLOW_PATHS) {
    lines.push(`Disallow: ${path}`);
  }

  lines.push("", `Sitemap: ${origin}/sitemap.xml`, "");
  return lines.join("\n");
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
  const urls = getSitemapEntries()
    .map((entry) => {
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
    })
    .join("\n");

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
