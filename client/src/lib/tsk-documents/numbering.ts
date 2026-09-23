import type { TskDocumentCounters, TskDocumentKind } from "./types";
import { TSK_DOCUMENT_PREFIX } from "./types";

type CounterKey = Exclude<keyof TskDocumentCounters, "year">;

const KIND_TO_COUNTER: Record<TskDocumentKind, CounterKey> = {
  devis: "devis",
  contrat: "contrat",
  facture_acompte: "facture_acompte",
  facture_intermediaire: "facture_intermediaire",
  facture_finale: "facture_finale",
  bon_livraison: "bon_livraison",
  contrat_maintenance: "contrat_maintenance",
};

export function syncCounterYear(counters: TskDocumentCounters): TskDocumentCounters {
  const year = new Date().getFullYear();
  if (counters.year === year) return counters;
  return {
    year,
    devis: 0,
    contrat: 0,
    facture_acompte: 0,
    facture_intermediaire: 0,
    facture_finale: 0,
    bon_livraison: 0,
    contrat_maintenance: 0,
  };
}

export function formatDocumentNumber(
  kind: TskDocumentKind,
  counters: TskDocumentCounters,
  seq: number,
): string {
  const prefix = TSK_DOCUMENT_PREFIX[KIND_TO_COUNTER[kind]];
  return `${prefix}-${counters.year}-${String(seq).padStart(4, "0")}`;
}

export function nextDocumentNumber(
  kind: TskDocumentKind,
  counters: TskDocumentCounters,
): { number: string; counters: TskDocumentCounters } {
  const synced = syncCounterYear(counters);
  const key = KIND_TO_COUNTER[kind];
  const nextSeq = synced[key] + 1;
  return {
    number: formatDocumentNumber(kind, synced, nextSeq),
    counters: { ...synced, [key]: nextSeq },
  };
}
