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
import {
  clientSiretDisplay,
  formatBicDisplay,
  formatVatLine,
  INVOICE_LATE_PAYMENT_FOOTER,
  invoiceStatusLabel,
} from "./legal-format";
import { documentDueDate, documentIssueDate } from "./project-schedule";
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
const CONTENT_BOTTOM = FOOTER_Y - 10;
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
  doc.line(MARGIN, FOOTER_Y - 5, PAGE_W - MARGIN, FOOTER_Y - 5);
  setFontNormal(doc, 6.5);
  doc.setTextColor(...TITANIUM);
  const line1 = `${settings.company} · ${settings.legalForm} · SIRET ${settings.siret}`;
  const line2 = `${settings.addressLine1} · ${issuerAddressLine2(settings)} · ${settings.phone}`;
  doc.text(line1, MARGIN, FOOTER_Y - 1);
  doc.text(line2, MARGIN, FOOTER_Y + 2.5);
}

function finalizePdf(ctx: PdfContext): void {
  const pages = ctx.doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    ctx.doc.setPage(i);
    drawRunningFooter(ctx);
    setFontNormal(ctx.doc, 7);
    ctx.doc.setTextColor(...TITANIUM);
    ctx.doc.text(`${i} / ${pages}`, PAGE_W - MARGIN, FOOTER_Y + 2.5, { align: "right" });
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
    const lines = doc.splitTextToSize(value, CONTENT_W - 40);
    doc.text(lines, MARGIN + 38, ctx.y);
    ctx.y += Math.max(4.8, lines.length * 4.2);
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

function drawParties(ctx: PdfContext, project: TskProject, opts?: { invoice?: boolean }): void {
  drawSectionTitle(ctx, "Émetteur & client");
  const s = ctx.settings;
  const issuerRows: [string, string][] = [
    ["Émetteur", s.company],
    ["Statut", s.legalForm || "Entrepreneur individuel (EI)"],
    ["Adresse", `${s.addressLine1}, ${issuerAddressLine2(s)}`],
    ["SIRET", s.siret],
    ["TVA", formatVatLine(s).replace(/^N° TVA intracommunautaire : /, "")],
    ["Contact", `${s.phone} · ${s.email}`],
  ];
  const clientRows: [string, string][] = [
    ["Client", project.client.company],
    ["Contact client", `${project.client.contactName} · ${project.client.email}`],
    [
      "Adresse client",
      `${project.client.addressLine1}, ${project.client.postalCode} ${project.client.city}`,
    ],
  ];
  if (opts?.invoice) {
    clientRows.push(["SIRET client", clientSiretDisplay(project)]);
    if (project.client.vatNumber.trim()) {
      clientRows.push(["TVA client", project.client.vatNumber.trim()]);
    }
  }
  drawMetaGrid(ctx, [...issuerRows, ...clientRows]);
}

function drawLineItemsTable(ctx: PdfContext, project: TskProject): void {
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
  const vat = vatAmount(subFull, project.vatRate);
  const ttc = totalTtc(subFull, project.vatRate);
  ensureSpace(ctx, 22);
  const xLabel = MARGIN + CONTENT_W * 0.58;
  setFontNormal(doc, 8.5);
  doc.text("Total HT", xLabel, ctx.y);
  doc.text(formatMoney(subFull), PAGE_W - MARGIN - 2, ctx.y, { align: "right" });
  ctx.y += 5;
  doc.text(`TVA (${project.vatRate} %)`, xLabel, ctx.y);
  doc.text(formatMoney(vat), PAGE_W - MARGIN - 2, ctx.y, { align: "right" });
  ctx.y += 5;
  setFontBold(doc, 8.5);
  doc.text("Total TTC", xLabel, ctx.y);
  doc.text(formatMoney(ttc), PAGE_W - MARGIN - 2, ctx.y, { align: "right" });
  setFontNormal(doc, 8.5);
  ctx.y += 8;

  const inter = project.useIntermediatePayment
    ? ` · Paiement intermédiaire (${depositLabel(project.intermediateMode, project.intermediatePercent)}) : ${formatMoney(intermediateAmountHt(project))} HT`
    : "";
  drawParagraph(
    ctx,
    `Acompte à la commande (${depositLabel(project.depositMode, project.depositPercent)}) : ${formatMoney(depositAmountHt(project))} HT · ${formatMoney(totalTtc(depositAmountHt(project), project.vatRate))} TTC${inter}. Solde final HT : ${formatMoney(finalBalanceHt(project))}.`,
    8.5,
  );
}

function drawSingleLineInvoice(
  ctx: PdfContext,
  project: TskProject,
  lineLabel: string,
  amountHt: number,
): void {
  drawSectionTitle(ctx, "Désignation");
  const { doc } = ctx;
  ensureSpace(ctx, 28);
  setFontNormal(doc, 9);
  doc.text(lineLabel, MARGIN, ctx.y);
  ctx.y += 8;
  const vat = vatAmount(amountHt, project.vatRate);
  const ttc = totalTtc(amountHt, project.vatRate);
  const xLabel = MARGIN + CONTENT_W * 0.58;
  doc.text("Montant HT", xLabel, ctx.y);
  doc.text(formatMoney(amountHt), PAGE_W - MARGIN - 2, ctx.y, { align: "right" });
  ctx.y += 5;
  doc.text(`TVA (${project.vatRate} %)`, xLabel, ctx.y);
  doc.text(formatMoney(vat), PAGE_W - MARGIN - 2, ctx.y, { align: "right" });
  ctx.y += 5;
  setFontBold(doc, 9);
  doc.text("Total TTC", xLabel, ctx.y);
  doc.text(formatMoney(ttc), PAGE_W - MARGIN - 2, ctx.y, { align: "right" });
  setFontNormal(doc, 9);
  ctx.y += 8;
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

function drawBankAndPenalties(ctx: PdfContext): void {
  drawSectionTitle(ctx, "Coordonnées bancaires");
  drawParagraph(
    ctx,
    `IBAN : ${ctx.settings.iban}\nBIC : ${formatBicDisplay(ctx.settings.bic)}`,
    8.5,
  );
  drawSectionTitle(ctx, "Conditions de règlement");
  drawParagraph(ctx, INVOICE_LATE_PAYMENT_FOOTER, 8);
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
    FS: project.finalInvoiceNumber ?? "—",
    TARIF_HT: formatMoney(project.maintenancePriceHt),
    PERIODE: project.maintenanceBilling === "monthly" ? "mois" : "an",
    HEURES: "2",
    TAUX_HORAIRE: formatMoney(project.maintenanceHourlyRateHt),
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
    case "facture_maintenance":
      return project.maintenanceInvoiceNumber ?? "—";
    default:
      return "—";
  }
}

function renderDevis(ctx: PdfContext, project: TskProject, kind: TskDocumentKind): void {
  const issue = documentIssueDate(project, kind);
  drawMetaGrid(ctx, [
    ["Projet", project.projectTitle],
    ["Date d'émission", formatDateFr(issue)],
    ["Validité", `${project.quoteValidityDays} jours`],
    ["Échéance paiement", `${project.paymentTermsDays} jours`],
  ]);
  drawParagraph(ctx, project.projectDescription);
  drawParties(ctx, project);
  drawLineItemsTable(ctx, project);
  drawSectionTitle(ctx, "Conditions de paiement");
  drawParagraph(
    ctx,
    interpolateLegalText(ctx.settings.paymentConditionsText, legalVars(project, ctx.settings)),
  );
  drawBankAndPenalties(ctx);
  if (project.notes) {
    drawSectionTitle(ctx, "Notes");
    drawParagraph(ctx, project.notes);
  }
  drawSignatures(ctx, project, `Bon pour accord — ${project.client.company}`);
}

function renderContract(ctx: PdfContext, project: TskProject, kind: TskDocumentKind): void {
  const c = project.contractClauses;
  const issue = documentIssueDate(project, kind);
  drawMetaGrid(ctx, [
    ["Contrat", project.contractNumber ?? "—"],
    ["Devis de réf.", project.quoteNumber ?? "—"],
    ["Projet", project.projectTitle],
    ["Date", formatDateFr(issue)],
  ]);
  drawParties(ctx, project);
  clause(ctx, project, "0. Hiérarchie des documents", c.documentHierarchy);
  clause(ctx, project, "1. Objet de la mission", c.object);
  clause(ctx, project, "2. Description des prestations", c.scope);
  clause(ctx, project, "Annexe 1 — Cahier des charges", c.specificationsAnnex);
  clause(ctx, project, "3. Livrables", c.deliverables);
  clause(ctx, project, "4. Planning", c.schedule);
  clause(ctx, project, "5. Délais de livraison", c.deliveryDelay);
  clause(ctx, project, "6. Révisions incluses", c.revisionsIncluded);
  clause(ctx, project, "7. Recette & acceptation", c.acceptanceProcedure);
  clause(ctx, project, "8. Obligations du client", c.clientObligations);
  clause(ctx, project, "9. Obligations de TSK Digital", c.providerObligations);
  drawLineItemsTable(ctx, project);
  clause(ctx, project, "10. Modalités de paiement", c.paymentTerms);
  clause(ctx, project, "11. Retard de paiement", c.latePayment);
  clause(ctx, project, "12. Propriété intellectuelle", c.intellectualProperty);
  clause(ctx, project, "13. RGPD — Sous-traitance", c.gdprArticle28);
  clause(ctx, project, "14. Outils d'IA", c.aiToolsClause);
  clause(ctx, project, "15. Comptes & licences", c.accountsAndLicenses);
  clause(ctx, project, "16. Avenants", c.amendmentsProcedure);
  clause(ctx, project, "17. Responsabilité", c.liabilityCap);
  clause(ctx, project, "18. Réversibilité", c.reversibility);
  clause(ctx, project, "19. Confidentialité", c.confidentiality);
  clause(ctx, project, "20. Maintenance & garantie", c.maintenance);
  clause(ctx, project, "21. Résiliation", c.termination);
  clause(ctx, project, "22. Force majeure", c.forceMajeure);
  clause(ctx, project, "23. Droit applicable", c.applicableLaw);
  drawSignatures(ctx, project, `Le Client — ${project.client.company}`);
}

function renderDepositInvoice(ctx: PdfContext, project: TskProject, kind: TskDocumentKind): void {
  const issue = documentIssueDate(project, kind);
  const due = documentDueDate(project, kind);
  const ref = project.quoteNumber ?? "—";
  const pct = depositLabel(project.depositMode, project.depositPercent);
  drawMetaGrid(ctx, [
    ["Facture d'acompte", project.depositInvoiceNumber ?? "—"],
    ["Devis", ref],
    ["Contrat", project.contractNumber ?? "—"],
    ["Date d'émission", formatDateFr(issue)],
    ["Échéance", formatDateFr(due)],
    [
      "Statut",
      invoiceStatusLabel(project.depositInvoiceStatus, project.depositPaidAt),
    ],
  ]);
  drawParties(ctx, project, { invoice: true });
  drawSingleLineInvoice(
    ctx,
    project,
    `Acompte ${pct} — Projet ${project.projectTitle} — Réf. ${ref}`,
    depositAmountHt(project),
  );
  drawBankAndPenalties(ctx);
}

function renderIntermediateInvoice(ctx: PdfContext, project: TskProject, kind: TskDocumentKind): void {
  const issue = documentIssueDate(project, kind);
  const due = documentDueDate(project, kind);
  const ref = project.quoteNumber ?? "—";
  const pct = depositLabel(project.intermediateMode, project.intermediatePercent);
  drawMetaGrid(ctx, [
    ["Facture intermédiaire", project.intermediateInvoiceNumber ?? "—"],
    ["Devis", ref],
    ["Acompte", project.depositInvoiceNumber ?? "—"],
    ["Date d'émission", formatDateFr(issue)],
    ["Échéance", formatDateFr(due)],
    [
      "Statut",
      invoiceStatusLabel(project.intermediateInvoiceStatus, project.intermediatePaidAt),
    ],
  ]);
  drawParties(ctx, project, { invoice: true });
  drawSingleLineInvoice(
    ctx,
    project,
    `Facture intermédiaire ${pct} — Jalon ${project.intermediateMilestoneLabel} — Réf. ${ref}`,
    intermediateAmountHt(project),
  );
  drawBankAndPenalties(ctx);
}

function renderFinalInvoice(ctx: PdfContext, project: TskProject, kind: TskDocumentKind): void {
  const issue = documentIssueDate(project, kind);
  const due = documentDueDate(project, kind);
  const ref = project.quoteNumber ?? "—";
  const sub = subtotalHt(project.lineItems);
  const soldePct =
    sub > 0 ? `${Math.round((finalBalanceHt(project) / sub) * 100)} %` : "solde";
  drawMetaGrid(ctx, [
    ["Facture de solde", project.finalInvoiceNumber ?? "—"],
    ["Devis", ref],
    ["Acompte", project.depositInvoiceNumber ?? "—"],
    [
      "Facture interm.",
      project.intermediateInvoiceNumber ?? (project.useIntermediatePayment ? "—" : "N/A"),
    ],
    ["Date d'émission", formatDateFr(issue)],
    ["Échéance", formatDateFr(due)],
    [
      "Statut",
      invoiceStatusLabel(project.finalInvoiceStatus, project.finalPaidAt),
    ],
  ]);
  drawParties(ctx, project, { invoice: true });
  drawPaymentRecap(ctx, project);
  drawSingleLineInvoice(
    ctx,
    project,
    `Solde ${soldePct} — Projet ${project.projectTitle} — Réf. ${ref}`,
    finalBalanceHt(project),
  );
  drawParagraph(
    ctx,
    `Solde sur commande totale ${formatMoney(totalTtc(sub, project.vatRate))} TTC — exigible après recette (PV ${project.deliveryDocNumber ?? "—"}).`,
    8.5,
  );
  drawBankAndPenalties(ctx);
}

function renderDelivery(ctx: PdfContext, project: TskProject, kind: TskDocumentKind): void {
  drawMetaGrid(ctx, [
    ["Procès-verbal", project.deliveryDocNumber ?? "—"],
    ["Projet livré", project.projectTitle],
    ["Date de livraison", formatDateFr(documentIssueDate(project, kind))],
    ["Devis", project.quoteNumber ?? "—"],
    ["Contrat", project.contractNumber ?? "—"],
  ]);
  drawParties(ctx, project);
  drawSectionTitle(ctx, "Environnements & versions");
  drawParagraph(
    ctx,
    `Production : ${project.deliveryUrlProduction || "(à compléter)"}\nStaging : ${project.deliveryUrlStaging || "(à compléter)"}\nRéférence technique : ${project.deliveryTechnicalRef || "(à compléter)"}`,
  );
  drawSectionTitle(ctx, "Réception & conformité des livrables");
  for (const line of project.deliveryChecklist.split("\n").filter(Boolean)) {
    drawParagraph(ctx, `• ${line.trim()}`);
  }
  drawParagraph(
    ctx,
    "Le Client reconnaît la réception des livrables. Délai de recette : huit (8) jours ouvrés (cf. contrat CT).",
  );
  drawParagraph(ctx, project.deliveryNotes);
  drawSectionTitle(ctx, "Réserves motivées");
  drawParagraph(ctx, project.deliveryReservesTemplate);
  drawParagraph(
    ctx,
    `Solde FS n° ${project.finalInvoiceNumber ?? "—"} exigible après recette ou expiration du délai de huit (8) jours ouvrés.`,
  );
  drawSignatures(ctx, project, `Réception & validation — ${project.client.contactName}`);
}

function renderMaintenanceContract(
  ctx: PdfContext,
  project: TskProject,
  template: TskMaintenanceContract,
  kind: TskDocumentKind,
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
    ["Date", formatDateFr(documentIssueDate(project, kind))],
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
    ["8. Tableau SLA", m.slaTable || template.slaTable],
    ["9. Sauvegardes", m.backupsPolicy || template.backupsPolicy],
    ["10. Sécurité", m.securityPolicy || template.securityPolicy],
    ["11. Performance", m.performancePolicy || template.performancePolicy],
    ["12. Exclusions", m.exclusions || template.exclusions],
    ["13. Hors forfait", m.hourlyRateExtra || template.hourlyRateExtra],
    ["14. Résiliation & restitution", m.terminationRestitution || template.terminationRestitution],
  ];
  for (const [title, body] of blocks) {
    clause(ctx, project, title, body);
  }
  drawSignatures(ctx, project, `Le Client — ${project.client.company}`);
}

function renderMaintenanceInvoice(ctx: PdfContext, project: TskProject, kind: TskDocumentKind): void {
  const issue = documentIssueDate(project, kind);
  const due = documentDueDate(project, kind);
  const cm = project.maintenanceContractNumber ?? "—";
  drawMetaGrid(ctx, [
    ["Facture maintenance", project.maintenanceInvoiceNumber ?? "—"],
    ["Contrat CM", cm],
    ["Période", project.maintenanceBilling === "monthly" ? "Mensuelle" : "Annuelle"],
    ["Date d'émission", formatDateFr(issue)],
    ["Échéance", formatDateFr(due)],
    ["Statut", "À payer"],
  ]);
  drawParties(ctx, project, { invoice: true });
  drawSingleLineInvoice(
    ctx,
    project,
    `Maintenance ${project.maintenanceBilling === "monthly" ? "mensuelle" : "annuelle"} — Contrat ${cm} — ${project.projectTitle}`,
    project.maintenancePriceHt,
  );
  drawBankAndPenalties(ctx);
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
      renderDevis(ctx, project, kind);
      break;
    case "contrat":
      renderContract(ctx, project, kind);
      break;
    case "facture_acompte":
      renderDepositInvoice(ctx, project, kind);
      break;
    case "facture_intermediaire":
      renderIntermediateInvoice(ctx, project, kind);
      break;
    case "facture_finale":
      renderFinalInvoice(ctx, project, kind);
      break;
    case "bon_livraison":
      renderDelivery(ctx, project, kind);
      break;
    case "contrat_maintenance":
      renderMaintenanceContract(ctx, project, settings.maintenanceContract, kind);
      break;
    case "facture_maintenance":
      renderMaintenanceInvoice(ctx, project, kind);
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
