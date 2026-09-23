import type { TskDocumentDraft, TskLineItem } from "./types";

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

export function depositAmount(draft: TskDocumentDraft): number {
  const base = subtotalHt(draft.lineItems);
  return (base * draft.depositPercent) / 100;
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
