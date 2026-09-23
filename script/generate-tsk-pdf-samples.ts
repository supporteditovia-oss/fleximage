/**
 * Génère les 6 PDF TSK Digital (démo) dans /opt/cursor/artifacts/
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
    return new Response(buf, {
      headers: { "content-type": "image/png" },
    });
  }
  throw new Error(`fetch non mocké: ${url}`);
}) as typeof fetch;

async function main() {
  const outDir = path.join(root, "client/public/brand/tsk/samples");
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync("/opt/cursor/artifacts/tsk-pdf-pack", { recursive: true });

  const { buildTskProjectPdf } = await import(
    "../client/src/lib/tsk-documents/pdf.ts"
  );

  let counters = {
    year: 2026,
    devis: 0,
    contrat: 0,
    facture_acompte: 0,
    facture: 0,
    bon_livraison: 0,
    cgv: 0,
  };
  const settings = createDefaultOrgSettings();
  let project = createDemoProject(settings);

  const kinds: TskDocumentKind[] = [
    "devis",
    "contrat",
    "facture_acompte",
    "facture",
    "bon_livraison",
  ];
  const fields = [
    "quoteNumber",
    "contractNumber",
    "depositInvoiceNumber",
    "finalInvoiceNumber",
    "deliveryDocNumber",
  ] as const;

  for (let i = 0; i < kinds.length; i += 1) {
    const kind = kinds[i]!;
    const n = nextDocumentNumber(kind, counters);
    counters = n.counters;
    project = { ...project, [fields[i]!]: n.number };
    project.depositInvoiceStatus = "paid";
    project.finalInvoiceStatus = "pending";
  }

  const cgvN = nextDocumentNumber("cgv", counters);
  counters = cgvN.counters;
  const settingsWithCgv = { ...settings, cgvNumber: cgvN.number };

  for (const kind of [...kinds, "cgv" as const]) {
    const built = await buildTskProjectPdf(
      project,
      settingsWithCgv,
      kind as TskDocumentKind,
    );
    const buf = Buffer.from(built.buffer);
    fs.writeFileSync(path.join(outDir, built.filename), buf);
    fs.writeFileSync(
      path.join("/opt/cursor/artifacts/tsk-pdf-pack", built.filename),
      buf,
    );
    console.log("wrote", built.filename, built.buffer.byteLength);
  }

  console.log("Public URL base: /brand/tsk/samples/");
  console.log("Pack PDF:", outDir, fs.readdirSync(outDir));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
