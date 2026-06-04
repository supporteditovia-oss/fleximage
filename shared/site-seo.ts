/** Canonical public site origin (no trailing slash). */
export const DEFAULT_SITE_ORIGIN = "https://larpking.com";

/** Legal pages: noindex in HTML + Disallow in robots.txt; omitted from sitemap.xml */
export const LEGAL_NOINDEX_PATHS = [
  "/mentions-legales",
  "/cgu",
  "/cgv",
  "/confidentialite",
] as const;

export type LegalNoindexPath = (typeof LEGAL_NOINDEX_PATHS)[number];

/** Paths blocked for crawlers (app, API, legal). */
export const ROBOTS_DISALLOW_PATHS = [
  "/api/",
  "/admin",
  "/admin/",
  "/app",
  "/generate",
  "/history",
  "/settings",
  "/login",
  "/register",
  "/debug-generate",
  "/face-capture",
  ...LEGAL_NOINDEX_PATHS,
] as const;

export const SITEMAP_ENTRIES = [
  { path: "/", changefreq: "weekly" as const, priority: "1.0" },
] as const;

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

export function buildSitemapXml(origin: string): string {
  const urls = SITEMAP_ENTRIES.map((entry) => {
    const loc = `${origin}${entry.path === "/" ? "/" : entry.path}`;
    return [
      "  <url>",
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <changefreq>${entry.changefreq}</changefreq>`,
      `    <priority>${entry.priority}</priority>`,
      "  </url>",
    ].join("\n");
  }).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

export function isLegalNoindexPath(pathname: string): boolean {
  return (LEGAL_NOINDEX_PATHS as readonly string[]).includes(pathname);
}
