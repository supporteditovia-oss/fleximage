/** Utilitaires de dates pour le workflow documentaire TSK. */

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addCalendarDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function addBusinessDays(iso: string, businessDays: number): string {
  const d = parseIsoDate(iso);
  let remaining = businessDays;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining -= 1;
  }
  return toIsoDate(d);
}

export function dueDateFromIssue(issueIso: string, paymentTermsDays: number): string {
  return addCalendarDays(issueIso, paymentTermsDays);
}
