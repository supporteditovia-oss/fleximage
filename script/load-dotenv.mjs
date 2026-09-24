import fs from "node:fs";
import path from "node:path";

/** Charge KEY=VALUE depuis .env (sans écraser process.env déjà défini). */
export function loadDotenv(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) return { loaded: 0, path: resolved };
  const text = fs.readFileSync(resolved, "utf8");
  let loaded = 0;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value;
      loaded += 1;
    }
  }
  return { loaded, path: resolved };
}
