import { jsPDF } from "jspdf";
import { TSK_BRAND } from "@/lib/tsk-brand/constants";
import {
  depositAmount,
  formatDateFr,
  formatMoney,
  lineTotalHt,
  subtotalHt,
  totalTtc,
  vatAmount,
} from "./calc";
import {
  TSK_DOCUMENT_FILENAME,
  TSK_DOCUMENT_LABELS,
  type TskDocumentDraft,
  type TskDocumentKind,
} from "./types";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

let logoCache: string | null = null;

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

async function loadLogoPng(): Promise<string> {
  if (logoCache) return logoCache;
  const res = await fetch(TSK_BRAND.assets.logoHorizontalPng);
  if (!res.ok) throw new Error("Logo TSK Digital introuvable");
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  logoCache = dataUrl;
  return dataUrl;
}

type PdfContext = {
  doc: jsPDF;
  y: number;
};

function ensureSpace(ctx: PdfContext, needed: number): void {
  if (ctx.y + needed <= PAGE_H - MARGIN) return;
  ctx.doc.addPage();
  ctx.y = MARGIN;
}

function drawHeader(ctx: PdfContext, logoDataUrl: string): void {
  const { doc } = ctx;
  const logoW = 52;
  const logoH = (logoW * 168) / 370;
  doc.addImage(logoDataUrl, "PNG", MARGIN, ctx.y, logoW, logoH);
  ctx.y += logoH + 10;

  doc.setDrawColor(...TITANIUM);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
  ctx.y += 8;
}

function drawTitle(ctx: PdfContext, kind: TskDocumentKind, reference: string): void {
  const { doc } = ctx;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(TSK_DOCUMENT_LABELS[kind].toUpperCase(), MARGIN, ctx.y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TITANIUM);
  doc.text(`Réf. ${reference}`, PAGE_W - MARGIN, ctx.y, { align: "right" });
  ctx.y += 10;
}

function drawBlockTitle(ctx: PdfContext, title: string): void {
  ensureSpace(ctx, 12);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(...TITANIUM);
  ctx.doc.text(title.toUpperCase(), MARGIN, ctx.y);
  ctx.y += 5;
}

function drawWrapped(
  ctx: PdfContext,
  text: string,
  opts?: { bold?: boolean; size?: number; color?: [number, number, number] },
): void {
  const size = opts?.size ?? 10;
  const color = opts?.color ?? INK;
  ctx.doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  ctx.doc.setFontSize(size);
  ctx.doc.setTextColor(...color);
  const lines = ctx.doc.splitTextToSize(text, CONTENT_W);
  for (const line of lines) {
    ensureSpace(ctx, size * 0.45 + 2);
    ctx.doc.text(line, MARGIN, ctx.y);
    ctx.y += size * 0.45 + 1.5;
  }
}

function drawParties(ctx: PdfContext, draft: TskDocumentDraft): void {
  const colW = CONTENT_W / 2 - 4;
  const startY = ctx.y;
  const { doc } = ctx;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TITANIUM);
  doc.text("ÉMETTEUR", MARGIN, ctx.y);
  doc.text("CLIENT", MARGIN + colW + 8, ctx.y);
  ctx.y += 5;

  const left = [
    draft.issuer.company,
    draft.issuer.addressLine1,
    draft.issuer.addressLine2,
    draft.issuer.email,
    draft.issuer.phone,
    draft.issuer.siret,
    draft.issuer.vat,
  ].filter(Boolean);

  const right = [
    draft.client.company,
    draft.client.contactName,
    draft.client.addressLine1,
    draft.client.addressLine2,
    draft.client.email,
  ].filter(Boolean);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);

  const maxLines = Math.max(left.length, right.length);
  for (let i = 0; i < maxLines; i += 1) {
    ensureSpace(ctx, 6);
    if (left[i]) doc.text(left[i], MARGIN, ctx.y);
    if (right[i]) doc.text(right[i], MARGIN + colW + 8, ctx.y);
    ctx.y += 5;
  }

  ctx.y = Math.max(ctx.y, startY + maxLines * 5 + 4);
  ctx.y += 4;
}

function drawMetaDates(ctx: PdfContext, draft: TskDocumentDraft): void {
  drawWrapped(
    ctx,
    `Projet : ${draft.projectTitle}\nDate d'émission : ${formatDateFr(draft.issueDate)}${
      draft.kind === "facture" || draft.kind === "facture_acompte"
        ? `\nÉchéance : ${formatDateFr(draft.dueDate)}`
        : ""
    }${
      draft.kind === "devis"
        ? `\nValidité du devis : ${draft.quoteValidityDays} jours`
        : ""
    }`,
    { size: 10 },
  );
  if (draft.projectDescription.trim()) {
    ctx.y += 2;
    drawWrapped(ctx, draft.projectDescription, { size: 9, color: TITANIUM });
  }
  ctx.y += 4;
}

function drawLineItemsTable(ctx: PdfContext, draft: TskDocumentDraft): void {
  const showTable =
    draft.kind === "devis" ||
    draft.kind === "facture" ||
    draft.kind === "facture_acompte" ||
    draft.kind === "contrat";

  if (!showTable || draft.lineItems.length === 0) return;

  drawBlockTitle(ctx, "Détail des prestations");

  const cols = {
    label: MARGIN,
    qty: MARGIN + CONTENT_W * 0.55,
    unit: MARGIN + CONTENT_W * 0.68,
    total: PAGE_W - MARGIN,
  };

  ensureSpace(ctx, 14);
  const { doc } = ctx;
  doc.setFillColor(...INK);
  doc.rect(MARGIN, ctx.y - 4, CONTENT_W, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("Description", cols.label + 2, ctx.y);
  doc.text("Qté", cols.qty, ctx.y);
  doc.text("P.U. HT", cols.unit, ctx.y);
  doc.text("Total HT", cols.total - 2, ctx.y, { align: "right" });
  ctx.y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);

  for (const item of draft.lineItems) {
    ensureSpace(ctx, 10);
    const labelLines = doc.splitTextToSize(item.label || "—", CONTENT_W * 0.52);
    doc.text(labelLines, cols.label + 2, ctx.y);
    doc.text(String(item.quantity), cols.qty, ctx.y);
    doc.text(formatMoney(item.unitPriceHt), cols.unit, ctx.y);
    doc.text(formatMoney(lineTotalHt(item)), cols.total - 2, ctx.y, {
      align: "right",
    });
    ctx.y += Math.max(5, labelLines.length * 4.5);
    doc.setDrawColor(230, 230, 230);
    doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y);
    ctx.y += 4;
  }

  const sub = subtotalHt(draft.lineItems);
  const vat = vatAmount(sub, draft.vatRate);
  const ttc = totalTtc(sub, draft.vatRate);

  ctx.y += 2;
  ensureSpace(ctx, 20);
  doc.setFontSize(9);
  doc.text("Sous-total HT", cols.unit, ctx.y);
  doc.text(formatMoney(sub), cols.total - 2, ctx.y, { align: "right" });
  ctx.y += 5;
  doc.text(`TVA (${draft.vatRate} %)`, cols.unit, ctx.y);
  doc.text(formatMoney(vat), cols.total - 2, ctx.y, { align: "right" });
  ctx.y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Total TTC", cols.unit, ctx.y);
  doc.text(formatMoney(ttc), cols.total - 2, ctx.y, { align: "right" });
  doc.setFont("helvetica", "normal");
  ctx.y += 8;

  if (draft.kind === "facture_acompte") {
    const deposit = depositAmount(draft);
    const depositTtc = totalTtc(deposit, draft.vatRate);
    drawWrapped(
      ctx,
      `Montant de l'acompte (${draft.depositPercent} % du HT) : ${formatMoney(deposit)} HT — ${formatMoney(depositTtc)} TTC.`,
      { bold: true },
    );
  }
}

function drawContractBody(ctx: PdfContext, draft: TskDocumentDraft): void {
  drawBlockTitle(ctx, "Objet");
  drawWrapped(ctx, draft.projectDescription);

  drawBlockTitle(ctx, "Périmètre");
  drawWrapped(ctx, draft.contractScope);

  drawBlockTitle(ctx, "Durée & planning");
  drawWrapped(ctx, draft.contractDuration);

  drawBlockTitle(ctx, "Conditions financières");
  const sub = subtotalHt(draft.lineItems);
  drawWrapped(
    ctx,
    `Montant total HT : ${formatMoney(sub)} — TTC : ${formatMoney(totalTtc(sub, draft.vatRate))}. Acompte de ${draft.depositPercent} % à la commande. Solde à la livraison. Paiement sous ${draft.paymentTermsDays} jours.`,
  );

  drawBlockTitle(ctx, "Propriété intellectuelle");
  drawWrapped(
    ctx,
    "Les livrables deviennent la propriété du client après paiement intégral. TSK Digital conserve le droit de mentionner le projet à titre de référence commerciale, sauf accord écrit contraire.",
  );

  drawBlockTitle(ctx, "Confidentialité");
  drawWrapped(
    ctx,
    "Chaque partie s'engage à conserver confidentielles les informations échangées dans le cadre de la prestation.",
  );

  drawBlockTitle(ctx, "Signatures");
  ctx.y += 4;
  ensureSpace(ctx, 40);
  const { doc } = ctx;
  doc.setDrawColor(...TITANIUM);
  doc.rect(MARGIN, ctx.y, CONTENT_W / 2 - 4, 28);
  doc.rect(MARGIN + CONTENT_W / 2 + 4, ctx.y, CONTENT_W / 2 - 4, 28);
  doc.setFontSize(8);
  doc.setTextColor(...TITANIUM);
  doc.text("TSK Digital", MARGIN + 3, ctx.y + 6);
  doc.text(`Client — ${draft.client.company}`, MARGIN + CONTENT_W / 2 + 7, ctx.y + 6);
  doc.text("Date et signature", MARGIN + 3, ctx.y + 22);
  doc.text("Date et signature", MARGIN + CONTENT_W / 2 + 7, ctx.y + 22);
  ctx.y += 36;
}

function drawValidationBody(ctx: PdfContext, draft: TskDocumentDraft): void {
  drawBlockTitle(ctx, "Récapitulatif");
  drawWrapped(
    ctx,
    `Le présent document atteste la réception et la validation du projet « ${draft.projectTitle} » (réf. ${draft.reference}).`,
  );

  drawBlockTitle(ctx, "Points validés");
  for (const line of draft.validationChecklist.split("\n").filter(Boolean)) {
    drawWrapped(ctx, `• ${line.trim()}`);
  }

  drawBlockTitle(ctx, "Clause de clôture");
  drawWrapped(
    ctx,
    "Le client confirme que les livrables sont conformes au périmètre convenu. Toute demande hors périmètre fera l'objet d'un devis complémentaire. La maintenance et l'évolution post-livraison ne sont pas incluses sauf contrat spécifique.",
  );

  drawBlockTitle(ctx, "Signatures");
  ctx.y += 4;
  ensureSpace(ctx, 40);
  const { doc } = ctx;
  doc.setDrawColor(...TITANIUM);
  doc.rect(MARGIN, ctx.y, CONTENT_W / 2 - 4, 28);
  doc.rect(MARGIN + CONTENT_W / 2 + 4, ctx.y, CONTENT_W / 2 - 4, 28);
  doc.setFontSize(8);
  doc.setTextColor(...TITANIUM);
  doc.text("TSK Digital — Chef de projet", MARGIN + 3, ctx.y + 6);
  doc.text(`Client — ${draft.client.contactName}`, MARGIN + CONTENT_W / 2 + 7, ctx.y + 6);
  doc.text("Bon pour validation", MARGIN + CONTENT_W / 2 + 7, ctx.y + 14);
  ctx.y += 36;
}

function drawDevisFooter(ctx: PdfContext, draft: TskDocumentDraft): void {
  drawBlockTitle(ctx, "Conditions");
  drawWrapped(
    ctx,
    `Devis valable ${draft.quoteValidityDays} jours. Acompte de ${draft.depositPercent} % à la commande. Délai de paiement : ${draft.paymentTermsDays} jours. TVA non applicable, art. 293 B du CGI le cas échéant — à adapter selon votre statut.`,
    { size: 9, color: TITANIUM },
  );
  if (draft.notes.trim()) {
    drawBlockTitle(ctx, "Notes");
    drawWrapped(ctx, draft.notes, { size: 9 });
  }
  ctx.y += 6;
  ensureSpace(ctx, 32);
  const { doc } = ctx;
  doc.setDrawColor(...TITANIUM);
  doc.line(MARGIN, ctx.y, MARGIN + 70, ctx.y);
  ctx.y += 5;
  doc.setFontSize(8);
  doc.setTextColor(...TITANIUM);
  doc.text("Bon pour accord — Date et signature client", MARGIN, ctx.y);
  ctx.y += 10;
}

function drawInvoiceFooter(ctx: PdfContext, draft: TskDocumentDraft): void {
  drawBlockTitle(ctx, "Modalités de règlement");
  drawWrapped(
    ctx,
    `Paiement sous ${draft.paymentTermsDays} jours à compter de la date d'émission.\nIBAN : ${draft.issuer.iban}\nBIC : ${draft.issuer.bic}`,
    { size: 9 },
  );
  if (draft.notes.trim()) {
    drawBlockTitle(ctx, "Notes");
    drawWrapped(ctx, draft.notes, { size: 9 });
  }
  ctx.y += 4;
  drawWrapped(
    ctx,
    "En cas de retard, des pénalités pourront être appliquées conformément à l'article L441-10 du Code de commerce.",
    { size: 8, color: TITANIUM },
  );
}

function drawPageFooter(ctx: PdfContext, draft: TskDocumentDraft): void {
  const { doc } = ctx;
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...TITANIUM);
    doc.text(
      `${TSK_BRAND.name} — ${draft.issuer.email} — Page ${i}/${pages}`,
      PAGE_W / 2,
      PAGE_H - 10,
      { align: "center" },
    );
  }
}

export async function generateTskDocumentPdf(draft: TskDocumentDraft): Promise<void> {
  const logo = await loadLogoPng();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ctx: PdfContext = { doc, y: MARGIN };

  drawHeader(ctx, logo);
  drawTitle(ctx, draft.kind, draft.reference);
  drawMetaDates(ctx, draft);
  drawParties(ctx, draft);

  if (draft.kind === "contrat") {
    drawLineItemsTable(ctx, draft);
    drawContractBody(ctx, draft);
  } else if (draft.kind === "validation_fin") {
    drawValidationBody(ctx, draft);
  } else {
    drawLineItemsTable(ctx, draft);
    if (draft.kind === "devis") drawDevisFooter(ctx, draft);
    if (draft.kind === "facture" || draft.kind === "facture_acompte") {
      drawInvoiceFooter(ctx, draft);
    }
  }

  drawPageFooter(ctx, draft);

  const safeRef = draft.reference.replace(/[^\w-]+/g, "-");
  doc.save(`${TSK_DOCUMENT_FILENAME[draft.kind]}-${safeRef}.pdf`);
}
