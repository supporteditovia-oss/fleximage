import fs from "node:fs";
import path from "node:path";

const GRAPHIFY_DIR = path.resolve("/workspace/graphify");
const ENTITIES_DIR = path.join(GRAPHIFY_DIR, "entities");
const RELATIONS_DIR = path.join(GRAPHIFY_DIR, "relations");
const INDEXES_DIR = path.join(GRAPHIFY_DIR, "indexes");

function buildIndex() {
  const componentIndex = {};
  const routeIndex = {};
  const apiIndex = {};
  const domainIndex = {};

  // 1. Charger relations Component -> Page
  const c2p = JSON.parse(fs.readFileSync(path.join(RELATIONS_DIR, "component-to-page.json"), "utf8"));
  for (const item of c2p.mappings) {
    componentIndex[item.component] = {
      file: item.file,
      pages: item.pages,
    };
  }

  // 2. Charger relations Page -> Route
  const p2r = JSON.parse(fs.readFileSync(path.join(RELATIONS_DIR, "page-to-route.json"), "utf8"));
  for (const item of p2r.mappings) {
    routeIndex[item.route] = {
      page: item.page,
      file: item.file,
    };
  }

  // 3. Charger relations Route -> API & API -> Supabase
  const r2a = JSON.parse(fs.readFileSync(path.join(RELATIONS_DIR, "route-to-api.json"), "utf8"));
  const a2s = JSON.parse(fs.readFileSync(path.join(RELATIONS_DIR, "api-to-supabase.json"), "utf8"));

  for (const item of a2s.mappings) {
    apiIndex[item.api] = {
      tables: item.supabaseTables,
      operations: item.operations,
    };
  }

  // 4. Charger Domaines
  const entityFiles = fs.readdirSync(ENTITIES_DIR);
  for (const file of entityFiles) {
    if (file.endsWith(".json")) {
      const data = JSON.parse(fs.readFileSync(path.join(ENTITIES_DIR, file), "utf8"));
      domainIndex[data.domain] = {
        description: data.description,
        file: `graphify/entities/${file}`,
      };
    }
  }

  // Écrire les index
  fs.writeFileSync(path.join(INDEXES_DIR, "components-index.json"), JSON.stringify(componentIndex, null, 2));
  fs.writeFileSync(path.join(INDEXES_DIR, "routes-index.json"), JSON.stringify(routeIndex, null, 2));
  fs.writeFileSync(path.join(INDEXES_DIR, "apis-index.json"), JSON.stringify(apiIndex, null, 2));
  fs.writeFileSync(path.join(INDEXES_DIR, "domains-index.json"), JSON.stringify(domainIndex, null, 2));

  // Index complet universel pour recherche immédiate O(1)
  const masterIndex = {
    updatedAt: new Date().toISOString(),
    domains: domainIndex,
    components: componentIndex,
    routes: routeIndex,
    apis: apiIndex,
  };
  fs.writeFileSync(path.join(INDEXES_DIR, "master-index.json"), JSON.stringify(masterIndex, null, 2));

  console.log("Master index generated successfully.");
}

buildIndex();
