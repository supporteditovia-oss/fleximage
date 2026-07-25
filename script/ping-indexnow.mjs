/**
 * Ping IndexNow with all indexable LuxeFlexIA URLs (core + SEO niches).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "client", "public");
const DATA_PATH = path.join(ROOT, "shared", "seo-niches.json");
const ORIGIN = "https://www.luxeflexia.com";
const HOST = "www.luxeflexia.com";
const INDEX_NOW_KEY = "luxeflexia2026indexnowbrand";

const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const nicheUrls = (data.niches || []).map(
  (niche) => `${ORIGIN}/generateur/${niche.slug}`,
);

const urlList = [
  `${ORIGIN}/`,
  `${ORIGIN}/generate`,
  `${ORIGIN}/pricing`,
  `${ORIGIN}/tous-les-generateurs`,
  `${ORIGIN}/sitemap.xml`,
  ...nicheUrls,
];

fs.writeFileSync(
  path.join(PUBLIC_DIR, `${INDEX_NOW_KEY}.txt`),
  INDEX_NOW_KEY,
  "utf8",
);

// IndexNow accepts max 10k URLs; we chunk by 100 for safety.
const chunkSize = 100;
for (let i = 0; i < urlList.length; i += chunkSize) {
  const chunk = urlList.slice(i, i + chunkSize);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: INDEX_NOW_KEY,
      keyLocation: `${ORIGIN}/${INDEX_NOW_KEY}.txt`,
      urlList: chunk,
    }),
  });
  console.log(
    `[seo:indexnow] chunk ${i / chunkSize + 1}: ${chunk.length} urls → HTTP ${res.status}`,
  );
}

console.log(`[seo:indexnow] done — ${urlList.length} URLs submitted`);
