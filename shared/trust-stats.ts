/** Minimum raw counts before we show a number (playbook: never invent). */
export const TRUST_STATS_MIN_TOTAL = 500;
export const TRUST_STATS_MIN_CREATORS = 100;
export const TRUST_STATS_MIN_RECENT = 50;

export type TrustStatsRaw = {
  totalGenerations: number;
  recentGenerations: number;
  creators: number;
};

export type TrustStatsDisplay = TrustStatsRaw & {
  showTotal: boolean;
  showRecent: boolean;
  showCreators: boolean;
};

export type TrustStatsPayload = {
  raw: TrustStatsRaw;
  display: TrustStatsDisplay;
  asOf: string;
};

/** Floor to a human-friendly marketing number — never inflate above reality. */
export function floorTrustCount(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw < 100) return Math.floor(raw / 10) * 10;
  if (raw < 1_000) return Math.floor(raw / 50) * 50;
  if (raw < 10_000) return Math.floor(raw / 500) * 500;
  return Math.floor(raw / 1_000) * 1_000;
}

export function buildTrustStatsDisplay(raw: TrustStatsRaw): TrustStatsDisplay {
  const totalGenerations = floorTrustCount(raw.totalGenerations);
  const recentGenerations = floorTrustCount(raw.recentGenerations);
  const creators = floorTrustCount(raw.creators);

  return {
    totalGenerations,
    recentGenerations,
    creators,
    showTotal:
      raw.totalGenerations >= TRUST_STATS_MIN_TOTAL && totalGenerations > 0,
    showRecent:
      raw.recentGenerations >= TRUST_STATS_MIN_RECENT && recentGenerations > 0,
    showCreators:
      raw.creators >= TRUST_STATS_MIN_CREATORS && creators > 0,
  };
}

export function buildTrustStatsPayload(raw: TrustStatsRaw): TrustStatsPayload {
  return {
    raw,
    display: buildTrustStatsDisplay(raw),
    asOf: new Date().toISOString(),
  };
}
