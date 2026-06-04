import type { Express } from "express";
import {
  buildRobotsTxt,
  buildSitemapXml,
  resolveSiteOrigin,
} from "@shared/site-seo";

export function registerSeoRoutes(app: Express): void {
  // SEO must use the public domain — never APP_URL (often http://localhost:5000).
  const origin = resolveSiteOrigin(process.env.SITE_URL ?? null);

  app.get("/robots.txt", (_req, res) => {
    res
      .type("text/plain")
      .set("Cache-Control", "public, max-age=3600")
      .send(buildRobotsTxt(origin));
  });

  app.get("/sitemap.xml", (_req, res) => {
    res
      .type("application/xml")
      .set("Cache-Control", "public, max-age=3600")
      .send(buildSitemapXml(origin));
  });
}
