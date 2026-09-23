/**
 * Génère les 7 PDF TSK Digital (démo) dans docs/tsk-digital/livrables/
 * Usage: npx tsx script/generate-tsk-pdf-samples.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDemoProject } from "../client/src/lib/tsk-documents/project-factory.ts";
import { createDefaultOrgSettings } from "../client/src/lib/tsk-documents/settings-defaults.ts";
import { nextDocumentNumber } from "../client/src/lib/tsk-documents/numbering.ts";
import type { TskDocumentKind } from "../client/src/lib/tsk-documents/types.ts";

const root = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const publicDir = path.join(root, "client/public");

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.startsWith("/brand/")) {
    const filePath = path.join(publicDir, url.replace(/^\//, ""));
    const buf = fs.readFileSync(filePath);
    const contentType = url.endsWith(".ttf")
      ? "font/ttf"
      : url.endsWith(".png")
        ? "image/png"
        : "application/octet-stream";
    return new Response(buf, { headers: { "content-type": contentType } });
  }
  throw new Error(`fetch non mocké: ${url}`);
}) as typeof fetch;

async function main() {
  const outDir = path.join(root, "docs/tsk-digital/livrables");
  fs.mkdirSync(outDir, { recursive: true });

  const { buildTskProjectPdf } = await import("../client/src/lib/tsk-documents/pdf.ts");

  let counters = {
    year: 2026,
    devis: 0,
    contrat: 0,
    facture_acompte: 0,
    facture_intermediaire: 0,
    facture_finale: 0,
    bon_livraison: 0,
    contrat_maintenance: 0,
  };
  const settings = createDefaultOrgSettings();
  let project = createDemoProject(settings);

  const kinds: TskDocumentKind[] = [
    "devis",
    "contrat",
    "facture_acompte",
    "facture_intermediaire",
    "facture_finale",
    "bon_livraison",
    "contrat_maintenance",
  ];
  const fields = [
    "quoteNumber",
    "contractNumber",
    "depositInvoiceNumber",
    "intermediateInvoiceNumber",
    "finalInvoiceNumber",
    "deliveryDocNumber",
    "maintenanceContractNumber",
  ] as const;

  for (let i = 0; i < kinds.length; i += 1) {
    const kind = kinds[i]!;
    const n = nextDocumentNumber(kind, counters);
    counters = n.counters;
    project = { ...project, [fields[i]!]: n.number };
    project.depositInvoiceStatus = "paid";
    project.intermediateInvoiceStatus = "paid";
    project.finalInvoiceStatus = "paid";
  }

  for (const kind of kinds) {
    const built = await buildTskProjectPdf(project, settings, kind);
    fs.writeFileSync(path.join(outDir, built.filename), Buffer.from(built.buffer));
    console.log("wrote", built.filename, built.buffer.byteLength);
  }

  console.log("Pack PDF (repo, hors site web):", outDir, fs.readdirSync(outDir));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
