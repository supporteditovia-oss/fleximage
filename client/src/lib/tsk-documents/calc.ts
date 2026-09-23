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

function percentForMode(mode: DepositMode, customPercent: number): number {
  if (mode === "percent_20") return 20;
  if (mode === "percent_30") return 30;
  if (mode === "percent_40") return 40;
  if (mode === "percent_custom") return customPercent;
  return 0;
}

function amountFromMode(
  sub: number,
  mode: DepositMode,
  customPercent: number,
  customAmountHt: number,
): number {
  if (mode === "amount_custom") {
    return Math.min(Math.max(customAmountHt, 0), sub);
  }
  return (sub * percentForMode(mode, customPercent)) / 100;
}

export function depositAmountHt(project: TskProject): number {
  return amountFromMode(
    subtotalHt(project.lineItems),
    project.depositMode,
    project.depositPercent,
    project.depositCustomAmountHt,
  );
}

export function intermediateAmountHt(project: TskProject): number {
  if (!project.useIntermediatePayment) return 0;
  const sub = subtotalHt(project.lineItems);
  const afterDeposit = sub - depositAmountHt(project);
  const raw = amountFromMode(
    sub,
    project.intermediateMode,
    project.intermediatePercent,
    project.intermediateCustomAmountHt,
  );
  return Math.min(raw, Math.max(0, afterDeposit));
}

export function finalBalanceHt(project: TskProject): number {
  const sub = subtotalHt(project.lineItems);
  return Math.max(0, sub - depositAmountHt(project) - intermediateAmountHt(project));
}

export function depositLabel(mode: DepositMode, customPercent: number): string {
  if (mode === "amount_custom") return "montant personnalisé";
  const preset = DEPOSIT_PRESETS.find((p) => p.id === mode);
  if (mode === "percent_custom") return `${customPercent} %`;
  return preset?.label ?? `${percentForMode(mode, customPercent)} %`;
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
