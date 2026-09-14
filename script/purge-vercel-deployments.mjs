#!/usr/bin/env node
/**
 * Purge old Vercel deployments — keeps only current production URLs.
 * Usage: node script/purge-vercel-deployments.mjs [--dry-run]
 */
import { spawnSync } from "node:child_process";

const KEEP = new Set([
  "luxeflexia-68u9cg30q-luxe-flex-ia.vercel.app",
  "fleximage-kngbxai4s-luxe-flex-ia.vercel.app",
]);

const PROJECTS = ["luxeflexia", "fleximage"];
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH = 15;

function vercelJson(args) {
  const result = spawnSync("npx", ["vercel", ...args, "--json"], {
    encoding: "utf8",
    cwd: process.cwd(),
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "vercel failed");
  }
  return JSON.parse(result.stdout);
}

function fetchAllDeployments(project) {
  const all = [];
  let next;
  for (;;) {
    const args = ["ls", project, "--limit", "100"];
    if (next) args.push("--next", String(next));
    const data = vercelJson(args);
    all.push(...(data.deployments || []));
    next = data.pagination?.next;
    if (!next) break;
  }
  return all;
}

function removeBatch(urls) {
  if (!urls.length) return;
  if (DRY_RUN) {
    console.log(`[dry-run] would remove ${urls.length}: ${urls[0]}…`);
    return;
  }
  const result = spawnSync(
    "npx",
    ["vercel", "remove", ...urls, "-y"],
    { encoding: "utf8", cwd: process.cwd() },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
  } else {
    console.log(`removed ${urls.length} deployments`);
  }
}

const toRemove = [];
for (const project of PROJECTS) {
  const deps = fetchAllDeployments(project);
  console.log(`${project}: ${deps.length} deployments total`);
  for (const dep of deps) {
    if (!KEEP.has(dep.url)) toRemove.push(dep.url);
  }
}

console.log(`Keeping ${KEEP.size} production deployments`);
console.log(`Removing ${toRemove.length} old deployments${DRY_RUN ? " (dry-run)" : ""}…`);

for (let i = 0; i < toRemove.length; i += BATCH) {
  removeBatch(toRemove.slice(i, i + BATCH));
}

console.log("Done.");
