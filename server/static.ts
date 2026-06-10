import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import {
  buildStructuredDataScript,
  getSeoPageMeta,
  isIndexableSitePath,
  isKnownSitePath,
  normalizeSitePathname,
  resolveSiteOrigin,
  SITE_OG_IMAGE,
} from "@shared/site-seo";

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function absoluteUrl(origin: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${origin}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function replaceOrInsertHeadTag(
  html: string,
  pattern: RegExp,
  replacement: string,
): string {
  if (pattern.test(html)) {
    return html.replace(pattern, replacement);
  }

  return html.replace("</head>", `    ${replacement}\n  </head>`);
}

function renderSeoHtml(indexHtml: string, requestPath: string): string {
  const origin = resolveSiteOrigin(process.env.SITE_URL ?? null);
  const pathname = normalizeSitePathname(requestPath);
  const page = getSeoPageMeta(pathname);
  const canonicalUrl = `${origin}${page.path === "/" ? "/" : page.path}`;
  const imageUrl = absoluteUrl(origin, SITE_OG_IMAGE);
  const robots = isIndexableSitePath(pathname)
    ? "index, follow, max-image-preview:large"
    : "noindex, nofollow";

  const escapedTitle = escapeHtmlAttribute(page.title);
  const escapedDescription = escapeHtmlAttribute(page.description);
  const escapedCanonical = escapeHtmlAttribute(canonicalUrl);
  const escapedImage = escapeHtmlAttribute(imageUrl);

  let html = indexHtml
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapedTitle}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapedDescription}" />`,
    )
    .replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${escapedCanonical}" />`,
    )
    .replace(
      /<meta property="og:url" content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${escapedCanonical}" />`,
    )
    .replace(
      /<meta property="og:title" content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${escapedTitle}" />`,
    )
    .replace(
      /<meta property="og:description" content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${escapedDescription}" />`,
    )
    .replace(
      /<meta property="og:image" content="[^"]*"\s*\/?>/i,
      `<meta property="og:image" content="${escapedImage}" />`,
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${escapedTitle}" />`,
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${escapedDescription}" />`,
    )
    .replace(
      /<meta name="twitter:image" content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:image" content="${escapedImage}" />`,
    )
    .replace("<!-- SEO_STRUCTURED_DATA -->", buildStructuredDataScript(origin));

  html = replaceOrInsertHeadTag(
    html,
    /<meta name="robots" content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="${robots}" />`,
  );

  return html;
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  const indexPath = path.resolve(distPath, "index.html");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }
  const indexHtml = fs.readFileSync(indexPath, "utf8");

  app.use(express.static(distPath, { index: false }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res) => {
    if (req.originalUrl.startsWith("/api/")) {
      return res.status(404).json({ message: "API route not found" });
    }

    const pathname = normalizeSitePathname(req.originalUrl);
    const isKnownPath = isKnownSitePath(pathname);
    const isIndexablePath = isIndexableSitePath(pathname);

    if (path.extname(pathname)) {
      return res.status(404).type("text/plain").send("Not found");
    }

    if (!isIndexablePath) {
      res.set("X-Robots-Tag", "noindex, nofollow");
    }

    res
      .status(isKnownPath ? 200 : 404)
      .type("html")
      .send(renderSeoHtml(indexHtml, pathname));
  });
}
