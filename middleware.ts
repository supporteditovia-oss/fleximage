import {
  isUnknownGenerateurPath,
  shouldCrawlerNoindexPathname,
} from "./shared/site-seo";

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Page introuvable — LuxeFlexIA</title>
</head>
<body>
  <p>Page introuvable.</p>
  <p><a href="https://www.luxeflexia.com/">Accueil</a> · <a href="https://www.luxeflexia.com/tous-les-generateurs">Générateurs IA</a></p>
</body>
</html>`;

export const config = {
  matcher: [
    "/((?!api/|assets/|_next/|favicon|robots\\.txt|sitemap\\.xml).*)",
  ],
};

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (isUnknownGenerateurPath(pathname)) {
    return new Response(NOT_FOUND_HTML, {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  const response = await fetch(request);
  if (!shouldCrawlerNoindexPathname(pathname)) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
