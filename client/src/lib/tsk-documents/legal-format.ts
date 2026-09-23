import type { TskOrgSettings, TskProject } from "./types";
import { formatDateFr } from "./calc";

export function formatBicDisplay(bic: string): string {
  const t = bic.trim();
  return t.length > 0 ? t : "À compléter";
}

export function formatVatLine(settings: TskOrgSettings): string {
  const vat = settings.vatNumber.trim();
  if (vat) return `N° TVA intracommunautaire : ${vat}`;
  if (settings.vatExempt293B) {
    return "TVA non applicable, art. 293 B du CGI";
  }
  return "N° TVA intracommunautaire : (à compléter si assujetti)";
}

export function issuerLegalLines(settings: TskOrgSettings): string[] {
  const lines = [
    settings.company,
    settings.legalForm.trim() || "Entrepreneur individuel (EI)",
    `${settings.addressLine1}, ${settings.postalCode} ${settings.city}`,
    `SIRET ${settings.siret}`,
    formatVatLine(settings),
    `${settings.phone} · ${settings.email}`,
  ];
  return lines;
}

export function invoiceStatusLabel(
  status: "pending" | "paid",
  paidAt: string | null,
): string {
  if (status === "paid" && paidAt) {
    return `Payée le ${formatDateFr(paidAt)}`;
  }
  if (status === "paid") {
    return "Payée";
  }
  return "À payer";
}

export function clientSiretDisplay(project: TskProject): string {
  const s = project.client.siret?.trim();
  return s || "(à compléter — client B2B)";
}

export const INVOICE_LATE_PAYMENT_FOOTER =
  "En cas de retard de paiement, pénalités au taux légal en vigueur et indemnité forfaitaire de recouvrement de 40 € due au titre de l'article L441-10 du Code de commerce (clients professionnels).";
