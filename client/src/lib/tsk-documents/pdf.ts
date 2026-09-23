import { jsPDF } from "jspdf";
import { TSK_BRAND } from "@/lib/tsk-brand/constants";
import {
  depositAmountHt,
  depositLabel,
  finalBalanceHt,
  formatDateFr,
  formatMoney,
  intermediateAmountHt,
  lineTotalHt,
  subtotalHt,
  totalTtc,
  vatAmount,
} from "./calc";
import { interpolateLegalText, issuerAddressLine2 } from "./settings-defaults";
import { registerInterFonts, setFontBold, setFontNormal } from "./pdf-fonts";
import {
  TSK_DOCUMENT_LABELS,
  type TskDocumentKind,
  type TskMaintenanceContract,
  type TskOrgSettings,
  type TskProject,
} from "./types";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 22;
const FOOTER_Y = PAGE_H - 14;
const CONTENT_BOTTOM = FOOTER_Y - 6;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LOGO_ASPECT = 531 / 1269;

const logoCache = new Map<string, string>();

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const INK = rgb(TSK_BRAND.colors.ink);
const TITANIUM = rgb(TSK_BRAND.colors.titanium);
const RULE = rgb(TSK_BRAND.colors.rule);

async function loadPrintLogo(settings: TskOrgSettings): Promise<string> {
  const custom = settings.logoDataUrl.trim();
  const src = custom || TSK_BRAND.assets.logoOfficialPrint;
  if (logoCache.has(src)) return logoCache.get(src)!;
  const res = await fetch(src);
  if (!res.ok) throw new Error("Logo TSK Digital introuvable");
  let dataUrl: string;
  if (typeof FileReader === "undefined") {
    const buf = Buffer.from(await res.arrayBuffer());
    dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  } else {
    const blob = await res.blob();
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  logoCache.set(src, dataUrl);
  return dataUrl;
}

type PdfContext = {
  doc: jsPDF;
  y: number;
  settings: TskOrgSettings;
  logoDataUrl: string;
  footerPending: boolean;
};

function newPage(ctx: PdfContext): void {
  if (ctx.footerPending) drawRunningFooter(ctx);
  ctx.doc.addPage();
  ctx.y = MARGIN;
  drawTopLogo(ctx, 48);
}

function ensureSpace(ctx: PdfContext, needed: number): void {
  if (ctx.y + needed <= CONTENT_BOTTOM) return;
  newPage(ctx);
}

function drawTopLogo(ctx: PdfContext, widthMm: number): void {
  const { doc } = ctx;
  const h = widthMm * LOGO_ASPECT;
  doc.addImage(ctx.logoDataUrl, "PNG", MARGIN, ctx.y, widthMm, h);
  ctx.y += h + 4;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
  ctx.y += 8;
  ctx.footerPending = true;
}

function drawRunningFooter(ctx: PdfContext): void {
  const { doc, settings } = ctx;
  const page = doc.getNumberOfPages();
  doc.setPage(page);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, FOOTER_Y - 4, PAGE_W - MARGIN, FOOTER_Y - 4);
  setFontNormal(doc, 7);
  doc.setTextColor(...TITANIUM);
  const iban = settings.iban ? ` · IBAN ${settings.iban}` : "";
  const addr = `${settings.company} · ${settings.addressLine1} · ${issuerAddressLine2(settings)} · ${settings.phone} · ${settings.email} · SIRET ${settings.siret}${iban}`;
  doc.text(addr, PAGE_W / 2, FOOTER_Y, { align: "center", maxWidth: CONTENT_W });
}

function finalizePdf(ctx: PdfContext): void {
  const pages = ctx.doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    ctx.doc.setPage(i);
    drawRunningFooter(ctx);
    setFontNormal(ctx.doc, 7);
    ctx.doc.setTextColor(...TITANIUM);
    ctx.doc.text(`Page ${i} / ${pages}`, PAGE_W - MARGIN, FOOTER_Y + 3, { align: "right" });
  }
}

function drawDocTitle(ctx: PdfContext, kind: TskDocumentKind, reference: string): void {
  const { doc } = ctx;
  setFontBold(doc, 14);
  doc.setTextColor(...INK);
  doc.text(TSK_DOCUMENT_LABELS[kind], MARGIN, ctx.y);
  setFontNormal(doc, 9);
  doc.setTextColor(...TITANIUM);
  doc.text(reference, PAGE_W - MARGIN, ctx.y, { align: "right" });
  ctx.y += 9;
}

function drawMetaGrid(ctx: PdfContext, rows: [string, string][]): void {
  const { doc } = ctx;
  for (const [label, value] of rows) {
    ensureSpace(ctx, 5);
    setFontBold(doc, 8.5);
    doc.setTextColor(...TITANIUM);
    doc.text(label, MARGIN, ctx.y);
    setFontNormal(doc, 8.5);
    doc.setTextColor(...INK);
    doc.text(value, MARGIN + 38, ctx.y);
    ctx.y += 4.8;
  }
  ctx.y += 3;
}

function drawSectionTitle(ctx: PdfContext, title: string): void {
  ensureSpace(ctx, 10);
  setFontBold(ctx.doc, 9);
  ctx.doc.setTextColor(...INK);
  ctx.doc.text(title, MARGIN, ctx.y);
  ctx.y += 5;
}

function drawParagraph(ctx: PdfContext, text: string, size = 9): void {
  setFontNormal(ctx.doc, size);
  ctx.doc.setTextColor(...INK);
  for (const block of text.split("\n")) {
    const lines = ctx.doc.splitTextToSize(block, CONTENT_W);
    for (const line of lines) {
      ensureSpace(ctx, 4.5);
      ctx.doc.text(line, MARGIN, ctx.y);
      ctx.y += 4.2;
    }
    ctx.y += 1;
  }
}

function drawParties(ctx: PdfContext, project: TskProject): void {
  drawSectionTitle(ctx, "Émetteur & client");
  const s = ctx.settings;
  drawMetaGrid(ctx, [
    ["Émetteur", s.company],
    ["Adresse", `${s.addressLine1}, ${issuerAddressLine2(s)}`],
    ["Contact", `${s.phone} · ${s.email}`],
    ["SIRET", s.siret],
    ["Client", project.client.company],
    ["Contact client", `${project.client.contactName} · ${project.client.email}`],
    [
      "Adresse client",
      `${project.client.addressLine1}, ${project.client.postalCode} ${project.client.city}`,
    ],
  ]);
}

type TableMode = "full" | "deposit" | "intermediate" | "balance";

function drawLineItemsTable(ctx: PdfContext, project: TskProject, mode: TableMode = "full"): void {
  drawSectionTitle(ctx, "Détail des prestations");
  const { doc } = ctx;
  ensureSpace(ctx, 14);
  doc.setFillColor(248, 248, 248);
  doc.rect(MARGIN, ctx.y - 3.5, CONTENT_W, 7, "F");
  setFontBold(doc, 7.5);
  doc.setTextColor(...INK);
  doc.text("Description", MARGIN + 2, ctx.y);
  doc.text("Qté", MARGIN + CONTENT_W * 0.54, ctx.y);
  doc.text("P.U. HT", MARGIN + CONTENT_W * 0.62, ctx.y);
  doc.text("Total HT", PAGE_W - MARGIN - 2, ctx.y, { align: "right" });
  ctx.y += 6;

  setFontNormal(doc, 8.5);
  for (const item of project.lineItems) {
    ensureSpace(ctx, 8);
    const desc = doc.splitTextToSize(item.label, CONTENT_W * 0.5);
    doc.text(desc, MARGIN + 2, ctx.y);
    doc.text(String(item.quantity), MARGIN + CONTENT_W * 0.54, ctx.y);
    doc.text(formatMoney(item.unitPriceHt), MARGIN + CONTENT_W * 0.62, ctx.y);
    doc.text(formatMoney(lineTotalHt(item)), PAGE_W - MARGIN - 2, ctx.y, { align: "right" });
    ctx.y += Math.max(5, desc.length * 4);
    doc.setDrawColor(...RULE);
    doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
    ctx.y += 3;
  }

  const subFull = subtotalHt(project.lineItems);
  const base =
    mode === "deposit"
      ? depositAmountHt(project)
      : mode === "intermediate"
        ? intermediateAmountHt(project)
        : mode === "balance"
          ? finalBalanceHt(project)
          : subFull;
  const vat = vatAmount(base, project.vatRate);
  const ttc = totalTtc(base, project.vatRate);

  ensureSpace(ctx, 22);
  const xLabel = MARGIN + CONTENT_W * 0.58;
  setFontNormal(doc, 8.5);
  doc.text("Total HT", xLabel, ctx.y);
  doc.text(formatMoney(base), PAGE_W - MARGIN - 2, ctx.y, { align: "right" });
  ctx.y += 5;
  doc.text(`TVA (${project.vatRate} %)`, xLabel, ctx.y);
  doc.text(formatMoney(vat), PAGE_W - MARGIN - 2, ctx.y, { align: "right" });
  ctx.y += 5;
  setFontBold(doc, 8.5);
  doc.text("Total TTC", xLabel, ctx.y);
  doc.text(formatMoney(ttc), PAGE_W - MARGIN - 2, ctx.y, { align: "right" });
  setFontNormal(doc, 8.5);
  ctx.y += 8;

  if (mode === "full") {
    const inter = project.useIntermediatePayment
      ? ` · Paiement intermédiaire (${depositLabel(project.intermediateMode, project.intermediatePercent)}) : ${formatMoney(intermediateAmountHt(project))} HT`
      : "";
    drawParagraph(
      ctx,
      `Acompte à la commande (${depositLabel(project.depositMode, project.depositPercent)}) : ${formatMoney(depositAmountHt(project))} HT · ${formatMoney(totalTtc(depositAmountHt(project), project.vatRate))} TTC${inter}. Solde final HT : ${formatMoney(finalBalanceHt(project))}.`,
      8.5,
    );
  }
  if (mode === "deposit") {
    drawParagraph(
      ctx,
      `Facture d'acompte — Solde restant HT après règlement : ${formatMoney(subFull - depositAmountHt(project))} · Total projet TTC : ${formatMoney(totalTtc(subFull, project.vatRate))}.`,
      8.5,
    );
  }
  if (mode === "intermediate") {
    drawParagraph(
      ctx,
      `Facture intermédiaire — Solde final HT restant : ${formatMoney(finalBalanceHt(project))} · Total projet TTC : ${formatMoney(totalTtc(subFull, project.vatRate))}.`,
      8.5,
    );
  }
}

function drawPaymentRecap(ctx: PdfContext, project: TskProject): void {
  const sub = subtotalHt(project.lineItems);
  drawSectionTitle(ctx, "Récapitulatif des règlements");
  const rows: string[] = [
    `Total devis HT : ${formatMoney(sub)} · TTC : ${formatMoney(totalTtc(sub, project.vatRate))}`,
    `Acompte ${project.depositInvoiceNumber ?? "—"} : − ${formatMoney(depositAmountHt(project))} HT`,
  ];
  if (project.useIntermediatePayment && project.intermediateInvoiceNumber) {
    rows.push(
      `Facture intermédiaire ${project.intermediateInvoiceNumber} : − ${formatMoney(intermediateAmountHt(project))} HT`,
    );
  }
  rows.push(`Solde facturé HT : ${formatMoney(finalBalanceHt(project))}`);
  drawParagraph(ctx, rows.join("\n"), 8.5);
}

function drawSignatures(ctx: PdfContext, project: TskProject, clientCaption: string): void {
  ensureSpace(ctx, 42);
  drawSectionTitle(ctx, "Signatures");
  const { doc } = ctx;
  const boxH = 28;
  doc.setDrawColor(...TITANIUM);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, ctx.y, CONTENT_W / 2 - 3, boxH);
  doc.rect(MARGIN + CONTENT_W / 2 + 3, ctx.y, CONTENT_W / 2 - 3, boxH);
  setFontNormal(doc, 8);
  doc.setTextColor(...INK);
  doc.text(ctx.settings.signatureIssuerTitle, MARGIN + 3, ctx.y + 7);
  doc.text(clientCaption, MARGIN + CONTENT_W / 2 + 6, ctx.y + 7);
  doc.setTextColor(...TITANIUM);
  doc.text("Date · Signature", MARGIN + 3, ctx.y + 22);
  doc.text("Date · Signature", MARGIN + CONTENT_W / 2 + 6, ctx.y + 22);
  ctx.y += boxH + 8;
}

function legalVars(project: TskProject, settings: TskOrgSettings): Record<string, string> {
  const inter = project.useIntermediatePayment
    ? depositLabel(project.intermediateMode, project.intermediatePercent)
    : "non applicable";
  return {
    DEVIS: project.quoteNumber ?? "—",
    DELAI: String(project.paymentTermsDays),
    CLIENT: project.client.company,
    PROJET: project.projectTitle,
    ACOMPTE: depositLabel(project.depositMode, project.depositPercent),
    INTER: inter,
    VALIDITE: String(project.quoteValidityDays),
    TARIF_HT: formatMoney(project.maintenancePriceHt),
    PERIODE: project.maintenanceBilling === "monthly" ? "mois" : "an",
    HEURES: "2",
  };
}

function clause(ctx: PdfContext, project: TskProject, title: string, body: string): void {
  drawSectionTitle(ctx, title);
  drawParagraph(ctx, interpolateLegalText(body, legalVars(project, ctx.settings)));
}

function docRef(project: TskProject, kind: TskDocumentKind): string {
  switch (kind) {
    case "devis":
      return project.quoteNumber ?? "—";
    case "contrat":
      return project.contractNumber ?? "—";
    case "facture_acompte":
      return project.depositInvoiceNumber ?? "—";
    case "facture_intermediaire":
      return project.intermediateInvoiceNumber ?? "—";
    case "facture_finale":
      return project.finalInvoiceNumber ?? "—";
    case "bon_livraison":
      return project.deliveryDocNumber ?? "—";
    case "contrat_maintenance":
      return project.maintenanceContractNumber ?? "—";
    default:
      return "—";
  }
}

function renderDevis(ctx: PdfContext, project: TskProject): void {
  drawMetaGrid(ctx, [
    ["Projet", project.projectTitle],
    ["Date d'émission", formatDateFr(project.issueDate)],
    ["Validité", `${project.quoteValidityDays} jours`],
    ["Échéance paiement", `${project.paymentTermsDays} jours`],
  ]);
  drawParagraph(ctx, project.projectDescription);
  drawParties(ctx, project);
  drawLineItemsTable(ctx, project, "full");
  drawSectionTitle(ctx, "Conditions de paiement");
  drawParagraph(
    ctx,
    interpolateLegalText(ctx.settings.paymentConditionsText, legalVars(project, ctx.settings)),
  );
  drawSectionTitle(ctx, "Coordonnées bancaires");
  drawParagraph(ctx, `IBAN : ${ctx.settings.iban}\nBIC : ${ctx.settings.bic || "—"}`);
  if (project.notes) {
    drawSectionTitle(ctx, "Notes");
    drawParagraph(ctx, project.notes);
  }
  drawSignatures(ctx, project, `Bon pour accord — ${project.client.company}`);
}

function renderContract(ctx: PdfContext, project: TskProject): void {
  const c = project.contractClauses;
  drawMetaGrid(ctx, [
    ["Contrat", project.contractNumber ?? "—"],
    ["Devis de réf.", project.quoteNumber ?? "—"],
    ["Projet", project.projectTitle],
    ["Date", formatDateFr(project.issueDate)],
  ]);
  drawParties(ctx, project);
  clause(ctx, project, "1. Objet de la mission", c.object);
  clause(ctx, project, "2. Description des prestations", c.scope);
  clause(ctx, project, "3. Livrables", c.deliverables);
  clause(ctx, project, "4. Planning", c.schedule);
  clause(ctx, project, "5. Délais de livraison", c.deliveryDelay);
  clause(ctx, project, "6. Révisions incluses", c.revisionsIncluded);
  clause(ctx, project, "7. Obligations du client", c.clientObligations);
  clause(ctx, project, "8. Obligations de TSK Digital", c.providerObligations);
  drawLineItemsTable(ctx, project, "full");
  clause(ctx, project, "9. Modalités de paiement", c.paymentTerms);
  clause(ctx, project, "10. Retard de paiement", c.latePayment);
  clause(ctx, project, "11. Propriété intellectuelle", c.intellectualProperty);
  clause(ctx, project, "12. Confidentialité", c.confidentiality);
  clause(ctx, project, "13. Maintenance", c.maintenance);
  clause(ctx, project, "14. Résiliation", c.termination);
  clause(ctx, project, "15. Force majeure", c.forceMajeure);
  clause(ctx, project, "16. Droit applicable", c.applicableLaw);
  drawSignatures(ctx, project, `Le Client — ${project.client.company}`);
}

function renderDepositInvoice(ctx: PdfContext, project: TskProject): void {
  drawMetaGrid(ctx, [
    ["Facture d'acompte", project.depositInvoiceNumber ?? "—"],
    ["Devis", project.quoteNumber ?? "—"],
    ["Contrat", project.contractNumber ?? "—"],
    ["Date", formatDateFr(project.issueDate)],
    ["Échéance", formatDateFr(project.dueDate)],
    ["Statut", project.depositInvoiceStatus === "paid" ? "Payée" : "En attente"],
  ]);
  drawParties(ctx, project);
  drawLineItemsTable(ctx, project, "deposit");
  drawSectionTitle(ctx, "Coordonnées bancaires");
  drawParagraph(ctx, `IBAN : ${ctx.settings.iban}\nBIC : ${ctx.settings.bic || "—"}`);
}

function renderIntermediateInvoice(ctx: PdfContext, project: TskProject): void {
  drawMetaGrid(ctx, [
    ["Facture intermédiaire", project.intermediateInvoiceNumber ?? "—"],
    ["Devis", project.quoteNumber ?? "—"],
    ["Acompte", project.depositInvoiceNumber ?? "—"],
    ["Date", formatDateFr(project.issueDate)],
    ["Échéance", formatDateFr(project.dueDate)],
    ["Statut", project.intermediateInvoiceStatus === "paid" ? "Payée" : "En attente"],
  ]);
  drawParties(ctx, project);
  drawParagraph(
    ctx,
    "Facture intermédiaire conformément au devis signé — paiement partiel avant livraison finale.",
  );
  drawLineItemsTable(ctx, project, "intermediate");
  drawSectionTitle(ctx, "Coordonnées bancaires");
  drawParagraph(ctx, `IBAN : ${ctx.settings.iban}\nBIC : ${ctx.settings.bic || "—"}`);
}

function renderFinalInvoice(ctx: PdfContext, project: TskProject): void {
  drawMetaGrid(ctx, [
    ["Facture de solde", project.finalInvoiceNumber ?? "—"],
    ["Devis", project.quoteNumber ?? "—"],
    ["Acompte", project.depositInvoiceNumber ?? "—"],
    [
      "Facture interm.",
      project.intermediateInvoiceNumber ?? (project.useIntermediatePayment ? "—" : "N/A"),
    ],
    ["Date", formatDateFr(project.issueDate)],
    ["Échéance", formatDateFr(project.dueDate)],
    ["Statut", project.finalInvoiceStatus === "paid" ? "Payée" : "En attente"],
  ]);
  drawParties(ctx, project);
  drawPaymentRecap(ctx, project);
  drawLineItemsTable(ctx, project, "balance");
  drawSectionTitle(ctx, "Règlement");
  drawParagraph(ctx, `IBAN : ${ctx.settings.iban}\nBIC : ${ctx.settings.bic || "—"}`);
}

function renderDelivery(ctx: PdfContext, project: TskProject): void {
  drawMetaGrid(ctx, [
    ["Procès-verbal", project.deliveryDocNumber ?? "—"],
    ["Projet livré", project.projectTitle],
    ["Date de livraison", formatDateFr(project.deliveryDate)],
    ["Devis", project.quoteNumber ?? "—"],
    ["Contrat", project.contractNumber ?? "—"],
  ]);
  drawParties(ctx, project);
  drawSectionTitle(ctx, "Réception & conformité des livrables");
  for (const line of project.deliveryChecklist.split("\n").filter(Boolean)) {
    drawParagraph(ctx, `• ${line.trim()}`);
  }
  drawParagraph(
    ctx,
    "Le Client reconnaît avoir reçu les livrables et valide leur conformité au périmètre contractuel, sous réserve des réserves écrites dans le délai convenu.",
  );
  drawParagraph(ctx, project.deliveryNotes);
  drawSignatures(ctx, project, `Réception & validation — ${project.client.contactName}`);
}

function renderMaintenanceContract(
  ctx: PdfContext,
  project: TskProject,
  template: TskMaintenanceContract,
): void {
  const m = project.maintenanceContract;
  drawMetaGrid(ctx, [
    ["Contrat maintenance", project.maintenanceContractNumber ?? "—"],
    ["Client", project.client.company],
    ["Projet couvert", project.projectTitle],
    ["Devis / Contrat", `${project.quoteNumber ?? "—"} · ${project.contractNumber ?? "—"}`],
    [
      "Tarif",
      `${formatMoney(project.maintenancePriceHt)} HT / ${project.maintenanceBilling === "monthly" ? "mois" : "an"}`,
    ],
    ["Date", formatDateFr(project.issueDate)],
  ]);
  drawParties(ctx, project);
  const blocks: [string, string][] = [
    ["1. Durée", m.duration || template.duration],
    ["2. Support", m.support || template.support],
    ["3. Mises à jour", m.updatesIncluded || template.updatesIncluded],
    ["4. Hébergement", m.hosting || template.hosting],
    ["5. Renouvellement", m.renewal || template.renewal],
    ["6. Tarification", m.pricingTerms || template.pricingTerms],
    ["7. Périmètre", m.scope || template.scope],
    ["8. SLA", m.sla || template.sla],
  ];
  for (const [title, body] of blocks) {
    clause(ctx, project, title, body);
  }
  drawSignatures(ctx, project, `Le Client — ${project.client.company}`);
}

export async function buildTskProjectPdf(
  project: TskProject,
  settings: TskOrgSettings,
  kind: TskDocumentKind,
): Promise<{ filename: string; buffer: ArrayBuffer }> {
  const logoDataUrl = await loadPrintLogo(settings);
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  await registerInterFonts(doc);

  const ctx: PdfContext = {
    doc,
    y: MARGIN,
    settings,
    logoDataUrl,
    footerPending: false,
  };

  drawTopLogo(ctx, 62);
  drawDocTitle(ctx, kind, docRef(project, kind));

  switch (kind) {
    case "devis":
      renderDevis(ctx, project);
      break;
    case "contrat":
      renderContract(ctx, project);
      break;
    case "facture_acompte":
      renderDepositInvoice(ctx, project);
      break;
    case "facture_intermediaire":
      renderIntermediateInvoice(ctx, project);
      break;
    case "facture_finale":
      renderFinalInvoice(ctx, project);
      break;
    case "bon_livraison":
      renderDelivery(ctx, project);
      break;
    case "contrat_maintenance":
      renderMaintenanceContract(ctx, project, settings.maintenanceContract);
      break;
  }

  finalizePdf(ctx);
  const ref = docRef(project, kind).replace(/[^\w-]+/g, "-");
  const filename = `TSK-Digital-${kind}-${ref}.pdf`;
  return { filename, buffer: doc.output("arraybuffer") };
}

export function downloadPdfFile(filename: string, buffer: ArrayBuffer): void {
  const blob = new Blob([buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function generateTskProjectPdf(
  project: TskProject,
  settings: TskOrgSettings,
  kind: TskDocumentKind,
): Promise<void> {
  const built = await buildTskProjectPdf(project, settings, kind);
  downloadPdfFile(built.filename, built.buffer);
}
