#!/usr/bin/env node
/**
 * Déploiement manuel prod — luxeflexia (client) + fleximage (admin).
 * À lancer uniquement quand tout est prêt : npm run vercel:deploy
 */
import { spawnSync } from "node:child_process";

const PROJECTS = [
  { name: "luxeflexia", label: "Client — www.luxeflexia.com" },
  { name: "fleximage", label: "Admin — fleximage.vercel.app" },
];

for (const { name, label } of PROJECTS) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(
    "npx",
    ["vercel", "deploy", "--prod", "--yes", "--project", name],
    { stdio: "inherit", cwd: process.cwd() },
  );
  if (result.status !== 0) {
    console.error(`Échec déploiement ${name}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\n✓ Déploiement prod terminé (luxeflexia + fleximage).");
