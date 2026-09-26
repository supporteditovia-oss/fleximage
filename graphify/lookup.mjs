#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const term = process.argv[2];
if (!term) {
  console.log("Usage: node graphify/lookup.mjs <Composant|Page|Route|Table|Domaine>");
  process.exit(1);
}

const masterIndexPath = "/workspace/graphify/indexes/master-index.json";
if (!fs.existsSync(masterIndexPath)) {
  console.error("Index non trouvé. Exécutez node graphify/build-index.mjs d'abord.");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(masterIndexPath, "utf8"));
const q = term.toLowerCase();

let found = false;

// Search domains
for (const [dom, val] of Object.entries(data.domains)) {
  if (dom.toLowerCase().includes(q)) {
    console.log(`[DOMAINE] ${dom}`);
    console.log(`  Description: ${val.description}`);
    console.log(`  Fichier: ${val.file}`);
    found = true;
  }
}

// Search components
for (const [comp, val] of Object.entries(data.components)) {
  if (comp.toLowerCase().includes(q)) {
    console.log(`[COMPOSANT] ${comp}`);
    console.log(`  Fichier source: ${val.file}`);
    console.log(`  Pages utilisatrices: ${val.pages.join(", ")}`);
    found = true;
  }
}

// Search routes
for (const [route, val] of Object.entries(data.routes)) {
  if (route.toLowerCase().includes(q) || val.page.toLowerCase().includes(q)) {
    console.log(`[ROUTE] ${route}`);
    console.log(`  Page associée: ${val.page}`);
    console.log(`  Fichier page: ${val.file}`);
    found = true;
  }
}

// Search APIs
for (const [api, val] of Object.entries(data.apis)) {
  if (api.toLowerCase().includes(q)) {
    console.log(`[API] ${api}`);
    console.log(`  Tables Supabase: ${val.tables.join(", ")}`);
    console.log(`  Opérations: ${val.operations.join(" | ")}`);
    found = true;
  }
}

if (!found) {
  console.log(`Aucune correspondance directe trouvée pour "${term}" dans l'index Graphify.`);
}
