import type { DepositMode, TskLineItem, TskProject } from "./types";
import { DEPOSIT_PRESETS } from "./project-factory";

export function lineTotalHt(item: TskLineItem): number {
  return item.quantity * item.unitPriceHt;
}

export function subtotalHt(items: TskLineItem[]): number {
  return items.reduce((sum, item) => sum + lineTotalHt(item), 0);
}

export function vatAmount(subtotal: number, rate: number): number {
  return (subtotal * rate) / 100;
}

export function totalTtc(subtotal: number, rate: number): number {
  return subtotal + vatAmount(subtotal, rate);
}

export function depositPercentForMode(project: TskProject): number {
  if (project.depositMode === "percent_20") return 20;
  if (project.depositMode === "percent_30") return 30;
  if (project.depositMode === "percent_40") return 40;
  if (project.depositMode === "percent_custom") return project.depositPercent;
  return 0;
}

export function depositAmountHt(project: TskProject): number {
  const sub = subtotalHt(project.lineItems);
  if (project.depositMode === "amount_custom") {
    return Math.min(Math.max(project.depositCustomAmountHt, 0), sub);
  }
  const pct = depositPercentForMode(project);
  return (sub * pct) / 100;
}

export function remainingBalanceHt(project: TskProject): number {
  return Math.max(0, subtotalHt(project.lineItems) - depositAmountHt(project));
}

export function depositLabel(mode: DepositMode, project: TskProject): string {
  if (mode === "amount_custom") return "Montant personnalisé";
  const preset = DEPOSIT_PRESETS.find((p) => p.id === mode);
  if (mode === "percent_custom") return `${project.depositPercent} %`;
  return preset?.label ?? `${depositPercentForMode(project)} %`;
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDateFr(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
