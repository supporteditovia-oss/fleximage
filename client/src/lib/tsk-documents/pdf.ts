import { jsPDF } from "jspdf";
import { TSK_BRAND } from "@/lib/tsk-brand/constants";
import {
  depositAmountHt,
  depositLabel,
  formatDateFr,
  formatMoney,
  lineTotalHt,
  remainingBalanceHt,
  subtotalHt,
  totalTtc,
  vatAmount,
} from "./calc";
import { issuerAddressLine2 } from "./settings-defaults";
import {
  TSK_DOCUMENT_LABELS,
  type TskDocumentKind,
  type TskOrgSettings,
  type TskProject,
} from "./types";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H = 26;

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
const WHITE: [number, number, number] = [255, 255, 255];

async function loadLogo(settings: TskOrgSettings): Promise<string> {
  const src =
    settings.logoDataUrl.trim() || TSK_BRAND.assets.logoOfficialHd;
  if (logoCache.has(src)) return logoCache.get(src)!;
  const res = await fetch(src);
  if (!res.ok) throw new Error("Logo TSK Digital introuvable");
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  logoCache.set(src, dataUrl);
  return dataUrl;
}

type PdfContext = {
  doc: jsPDF;
  y: number;
  settings: TskOrgSettings;
};

function ensureSpace(ctx: PdfContext, needed: number): void {
  if (ctx.y + needed <= PAGE_H - 22) return;
  drawPageFooter(ctx);
  ctx.doc.addPage();
  drawPageHeaderBand(ctx, "");
  ctx.y = HEADER_H + 12;
}

function drawPageHeaderBand(ctx: PdfContext, logoDataUrl: string): void {
  const { doc } = ctx;
  doc.setFillColor(...INK);
  doc.rect(0, 0, PAGE_W, HEADER_H, "F");
  if (logoDataUrl) {
    const logoW = 58;
    const logoH = (logoW * 887) / 1774;
    doc.addImage(logoDataUrl, "PNG", MARGIN, (HEADER_H - logoH) / 2, logoW, logoH);
  }
}

function drawPageFooter(ctx: PdfContext): void {
  const { doc, settings } = ctx;
  const pages = doc.getNumberOfPages();
  const line1 = `${settings.company} · ${settings.addressLine1} · ${issuerAddressLine2(settings)}`;
  const line2 = `${settings.phone} · ${settings.email} · SIRET ${settings.siret}`;
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...TITANIUM);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_H - 16, PAGE_W - MARGIN, PAGE_H - 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...TITANIUM);
    doc.text(line1, PAGE_W / 2, PAGE_H - 12, { align: "center" });
    doc.text(`${line2} · Page ${i}/${pages}`, PAGE_W / 2, PAGE_H - 8, {
      align: "center",
    });
  }
}

function drawTitle(ctx: PdfContext, kind: TskDocumentKind, reference: string): void {
  const { doc } = ctx;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text(TSK_DOCUMENT_LABELS[kind].toUpperCase(), MARGIN, ctx.y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...TITANIUM);
  doc.text(reference, PAGE_W - MARGIN, ctx.y, { align: "right" });
  ctx.y += 9;
}

function drawBlockTitle(ctx: PdfContext, title: string): void {
  ensureSpace(ctx, 10);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(8.5);
  ctx.doc.setTextColor(...TITANIUM);
  ctx.doc.text(title.toUpperCase(), MARGIN, ctx.y);
  ctx.y += 4.5;
}

function drawWrapped(
  ctx: PdfContext,
  text: string,
  opts?: { bold?: boolean; size?: number; color?: [number, number, number] },
): void {
  const size = opts?.size ?? 9.5;
  const color = opts?.color ?? INK;
  ctx.doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  ctx.doc.setFontSize(size);
  ctx.doc.setTextColor(...color);
  const lines = ctx.doc.splitTextToSize(text, CONTENT_W);
  for (const line of lines) {
    ensureSpace(ctx, size * 0.42 + 2);
    ctx.doc.text(line, MARGIN, ctx.y);
    ctx.y += size * 0.42 + 1.2;
  }
}

function drawParties(ctx: PdfContext, project: TskProject): void {
  const { doc } = ctx;
  const colW = CONTENT_W / 2 - 5;
  const y0 = ctx.y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...TITANIUM);
  doc.text("TSK DIGITAL", MARGIN, ctx.y);
  doc.text("CLIENT", MARGIN + colW + 10, ctx.y);
  ctx.y += 4.5;
  const left = [
    ctx.settings.company,
    ctx.settings.addressLine1,
    issuerAddressLine2(ctx.settings),
    ctx.settings.phone,
    ctx.settings.email,
    ctx.settings.siret ? `SIRET ${ctx.settings.siret}` : "",
    ctx.settings.vatNumber ? `TVA ${ctx.settings.vatNumber}` : "",
  ].filter(Boolean);
  const right = [
    project.client.company,
    project.client.contactName,
    project.client.addressLine1,
    `${project.client.postalCode} ${project.client.city}`.trim(),
    project.client.email,
    project.client.phone,
  ].filter(Boolean);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  const n = Math.max(left.length, right.length);
  for (let i = 0; i < n; i += 1) {
    ensureSpace(ctx, 5);
    if (left[i]) doc.text(left[i], MARGIN, ctx.y);
    if (right[i]) doc.text(right[i], MARGIN + colW + 10, ctx.y);
    ctx.y += 4.5;
  }
  ctx.y = Math.max(ctx.y, y0 + n * 4.5 + 2);
  ctx.y += 3;
}

function drawLineItems(ctx: PdfContext, project: TskProject, amountBase?: "full" | "deposit" | "balance"): void {
  drawBlockTitle(ctx, "Prestations");
  const { doc } = ctx;
  ensureSpace(ctx, 16);
  doc.setFillColor(...INK);
  doc.rect(MARGIN, ctx.y - 3.5, CONTENT_W, 6.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text("Description", MARGIN + 2, ctx.y);
  doc.text("Qté", MARGIN + CONTENT_W * 0.52, ctx.y);
  doc.text("P.U. HT", MARGIN + CONTENT_W * 0.62, ctx.y);
  doc.text("Total HT", PAGE_W - MARGIN - 2, ctx.y, { align: "right" });
  ctx.y += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  for (const item of project.lineItems) {
    ensureSpace(ctx, 8);
    const lines = doc.splitTextToSize(item.label || "—", CONTENT_W * 0.48);
    doc.text(lines, MARGIN + 2, ctx.y);
    doc.text(String(item.quantity), MARGIN + CONTENT_W * 0.52, ctx.y);
    doc.text(formatMoney(item.unitPriceHt), MARGIN + CONTENT_W * 0.62, ctx.y);
    doc.text(formatMoney(lineTotalHt(item)), PAGE_W - MARGIN - 2, ctx.y, {
      align: "right",
    });
    ctx.y += Math.max(4.5, lines.length * 4);
    doc.setDrawColor(235, 235, 235);
    doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
    ctx.y += 3.5;
  }

  const subFull = subtotalHt(project.lineItems);
  const sub =
    amountBase === "deposit"
      ? depositAmountHt(project)
      : amountBase === "balance"
        ? remainingBalanceHt(project)
        : subFull;
  const vat = vatAmount(sub, project.vatRate);
  const ttc = totalTtc(sub, project.vatRate);

  ctx.y += 2;
  ensureSpace(ctx, 18);
  const col = MARGIN + CONTENT_W * 0.62;
  doc.text("Base HT", col, ctx.y);
  doc.text(formatMoney(sub), PAGE_W - MARGIN - 2, ctx.y, { align: "right" });
  ctx.y += 4.5;
  doc.text(`TVA (${project.vatRate} %)`, col, ctx.y);
  doc.text(formatMoney(vat), PAGE_W - MARGIN - 2, ctx.y, { align: "right" });
  ctx.y += 4.5;
  doc.setFont("helvetica", "bold");
  doc.text("Total TTC", col, ctx.y);
  doc.text(formatMoney(ttc), PAGE_W - MARGIN - 2, ctx.y, { align: "right" });
  doc.setFont("helvetica", "normal");
  ctx.y += 7;

  if (amountBase === "deposit") {
    drawWrapped(
      ctx,
      `Acompte (${depositLabel(project.depositMode, project)}) sur un total projet de ${formatMoney(totalTtc(subFull, project.vatRate))} TTC. Solde restant HT : ${formatMoney(remainingBalanceHt(project))}.`,
      { size: 8.5, color: TITANIUM },
    );
  }
  if (amountBase === "balance") {
    drawWrapped(
      ctx,
      `Facture de solde après acompte. Total projet TTC : ${formatMoney(totalTtc(subFull, project.vatRate))}.`,
      { size: 8.5, color: TITANIUM },
    );
  }
}

function drawSignatureBlocks(ctx: PdfContext, project: TskProject, clientLabel: string): void {
  ensureSpace(ctx, 38);
  const { doc } = ctx;
  doc.setDrawColor(...TITANIUM);
  const h = 26;
  doc.rect(MARGIN, ctx.y, CONTENT_W / 2 - 4, h);
  doc.rect(MARGIN + CONTENT_W / 2 + 4, ctx.y, CONTENT_W / 2 - 4, h);
  doc.setFontSize(8);
  doc.setTextColor(...TITANIUM);
  doc.text(ctx.settings.signatureIssuerName || ctx.settings.company, MARGIN + 3, ctx.y + 6);
  doc.text(clientLabel, MARGIN + CONTENT_W / 2 + 7, ctx.y + 6);
  doc.text("Date et signature", MARGIN + 3, ctx.y + 20);
  doc.text("Date et signature", MARGIN + CONTENT_W / 2 + 7, ctx.y + 20);
  ctx.y += h + 6;
}

function documentReference(project: TskProject, kind: TskDocumentKind): string {
  switch (kind) {
    case "devis":
      return project.quoteNumber ?? "—";
    case "contrat":
      return project.contractNumber ?? "—";
    case "facture_acompte":
      return project.depositInvoiceNumber ?? "—";
    case "facture":
      return project.finalInvoiceNumber ?? "—";
    case "bon_livraison":
      return project.deliveryDocNumber ?? "—";
    case "attestation_maintenance":
      return project.maintenanceDocNumber ?? project.deliveryDocNumber ?? "—";
    default:
      return "—";
  }
}

function drawDevis(ctx: PdfContext, project: TskProject): void {
  drawWrapped(
    ctx,
    `Projet : ${project.projectTitle}\nÉmis le ${formatDateFr(project.issueDate)} · Validité : ${project.quoteValidityDays} jours`,
    { size: 9.5 },
  );
  if (project.projectDescription) {
    drawWrapped(ctx, project.projectDescription, { size: 9, color: TITANIUM });
  }
  ctx.y += 2;
  drawParties(ctx, project);
  drawLineItems(ctx, project, "full");
  drawBlockTitle(ctx, "Acompte & paiement");
  drawWrapped(
    ctx,
    `Acompte à la commande : ${depositLabel(project.depositMode, project)} (${formatMoney(depositAmountHt(project))} HT).\n${ctx.settings.paymentConditionsText}\nPaiement sous ${project.paymentTermsDays} jours.`,
  );
  if (project.notes) {
    drawBlockTitle(ctx, "Notes");
    drawWrapped(ctx, project.notes, { size: 9 });
  }
  drawSignatureBlocks(ctx, project, `Client — ${project.client.company || project.client.contactName}`);
}

function drawContract(ctx: PdfContext, project: TskProject): void {
  const c = project.contractClauses;
  drawWrapped(
    ctx,
    `Contrat n° ${project.contractNumber ?? "—"} · Devis de référence : ${project.quoteNumber ?? "—"}\nObjet : ${project.projectTitle}`,
    { bold: true, size: 9.5 },
  );
  ctx.y += 2;
  drawParties(ctx, project);
  const sections: [string, string][] = [
    ["1. Objet", c.object],
    ["2. Description des prestations", c.scope],
    ["3. Calendrier", c.schedule],
    ["4. Délais de livraison", c.deliveryDelay],
    ["5. Révisions incluses", c.revisionsIncluded],
    ["6. Obligations du client", c.clientObligations],
    [`7. Obligations de ${ctx.settings.company}`, c.providerObligations],
    ["8. Modalités de paiement", c.paymentTerms],
    ["9. Retard de paiement", c.latePayment],
    ["10. Propriété intellectuelle", c.intellectualProperty],
    ["11. Confidentialité", c.confidentiality],
    ["12. Résiliation", c.termination],
    ["13. Force majeure", c.forceMajeure],
    ["14. Droit applicable", c.applicableLaw],
  ];
  for (const [title, body] of sections) {
    drawBlockTitle(ctx, title);
    drawWrapped(ctx, body);
  }
  drawLineItems(ctx, project, "full");
  drawSignatureBlocks(ctx, project, `Le Client — ${project.client.company}`);
}

function drawDepositInvoice(ctx: PdfContext, project: TskProject): void {
  drawWrapped(
    ctx,
    `Facture d'acompte · Devis ${project.quoteNumber ?? "—"} · Contrat ${project.contractNumber ?? "—"}\nÉchéance : ${formatDateFr(project.dueDate)}`,
    { size: 9.5 },
  );
  drawParties(ctx, project);
  drawLineItems(ctx, project, "deposit");
  drawBlockTitle(ctx, "Règlement");
  drawWrapped(
    ctx,
    `IBAN : ${ctx.settings.iban}\nBIC : ${ctx.settings.bic}\nStatut : ${project.depositInvoiceStatus === "paid" ? "Payée" : "En attente"}`,
  );
}

function drawFinalInvoice(ctx: PdfContext, project: TskProject): void {
  drawWrapped(
    ctx,
    `Facture de solde · Devis ${project.quoteNumber ?? "—"}\nRéf. acompte : ${project.depositInvoiceNumber ?? "—"}\nÉchéance : ${formatDateFr(project.dueDate)}`,
    { size: 9.5 },
  );
  drawParties(ctx, project);
  drawLineItems(ctx, project, "balance");
  drawBlockTitle(ctx, "Règlement");
  drawWrapped(
    ctx,
    `IBAN : ${ctx.settings.iban}\nBIC : ${ctx.settings.bic}\nStatut : ${project.finalInvoiceStatus === "paid" ? "Payée" : "En attente"}`,
  );
}

function drawDelivery(ctx: PdfContext, project: TskProject): void {
  drawWrapped(
    ctx,
    `Bon de livraison et validation · Projet : ${project.projectTitle}\nDate de livraison : ${formatDateFr(project.deliveryDate)}`,
    { size: 9.5 },
  );
  drawParties(ctx, project);
  drawBlockTitle(ctx, "Validation des livrables");
  for (const line of project.deliveryChecklist.split("\n").filter(Boolean)) {
    drawWrapped(ctx, `• ${line.trim()}`);
  }
  drawWrapped(
    ctx,
    "Le client reconnaît avoir reçu les livrables et valide la mise en production. Toute réserve doit être formulée par écrit sous huit (8) jours.",
    { size: 9, color: TITANIUM },
  );
  drawSignatureBlocks(ctx, project, `Validation client — ${project.client.contactName}`);
}

function drawMaintenance(ctx: PdfContext, project: TskProject): void {
  const m = project.maintenanceTerms;
  drawWrapped(
    ctx,
    `Attestation de maintenance · Projet : ${project.projectTitle}\nÀ compter de la livraison du ${formatDateFr(project.deliveryDate)}`,
    { size: 9.5 },
  );
  drawParties(ctx, project);
  const blocks: [string, string][] = [
    ["Durée", m.duration],
    ["Mises à jour incluses", m.updatesIncluded],
    ["Support", m.support],
    ["Hébergement", m.hosting],
    ["Renouvellement", m.renewal],
  ];
  for (const [title, body] of blocks) {
    drawBlockTitle(ctx, title);
    drawWrapped(ctx, body);
  }
  drawSignatureBlocks(ctx, project, ctx.settings.company);
}

function renderKind(ctx: PdfContext, project: TskProject, kind: TskDocumentKind): void {
  switch (kind) {
    case "devis":
      drawDevis(ctx, project);
      break;
    case "contrat":
      drawContract(ctx, project);
      break;
    case "facture_acompte":
      drawDepositInvoice(ctx, project);
      break;
    case "facture":
      drawFinalInvoice(ctx, project);
      break;
    case "bon_livraison":
      drawDelivery(ctx, project);
      break;
    case "attestation_maintenance":
      drawMaintenance(ctx, project);
      break;
  }
}

export async function generateTskProjectPdf(
  project: TskProject,
  settings: TskOrgSettings,
  kind: TskDocumentKind,
): Promise<void> {
  const logo = await loadLogo(settings);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ctx: PdfContext = { doc, y: HEADER_H + 12, settings };
  drawPageHeaderBand(ctx, logo);
  drawTitle(ctx, kind, documentReference(project, kind));
  renderKind(ctx, project, kind);
  drawPageFooter(ctx);
  const ref = documentReference(project, kind).replace(/[^\w-]+/g, "-");
  doc.save(`TSK-Digital-${kind}-${ref}.pdf`);
}
