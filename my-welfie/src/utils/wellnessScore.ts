/**
 * SDK-native wellness display (P0 — no custom 0–100 normalization).
 * See my-welfie/docs/Important-Vital-Guide.md
 */

/** @deprecated Use SDK-native display; kept for ring max hint when index is 0–100 scale */
export const WELLNESS_DISPLAY_MAX = 100;

export const WELLNESS_LEVEL_LABELS: Record<number, string> = {
  0: 'Unknown',
  1: 'Low',
  2: 'Normal',
  3: 'High',
};

/** Raw wellness index as returned by the SDK (no scale conversion). */
export function getWellnessIndexRaw(raw?: number | null): number | null {
  if (raw == null || Number.isNaN(raw)) return null;
  return raw;
}

/** Display denominator for wellness hero (e.g. 7/10). */
export const WELLNESS_SCORE_OUT_OF = 10;

/** Map SDK wellness index to a 0–10 display scale (SDK may return 0–100 or 0–10). */
export function getWellnessIndexOnTenScale(raw?: number | null): number | null {
  const v = getWellnessIndexRaw(raw);
  if (v == null) return null;
  const scaled = v > WELLNESS_SCORE_OUT_OF ? v / 10 : v;
  return Math.round(scaled * 10) / 10;
}

export function formatWellnessIndexOnTenDisplay(raw?: number | null): string {
  const v = getWellnessIndexOnTenScale(raw);
  if (v == null) return '—';
  const num = Number.isInteger(v) ? String(v) : v.toFixed(1);
  return `${num}/${WELLNESS_SCORE_OUT_OF}`;
}

/** Format wellness index for display — preserves SDK value. */
export function formatWellnessIndexDisplay(raw?: number | null): string {
  const v = getWellnessIndexRaw(raw);
  if (v == null) return '—';
  if (Number.isInteger(v)) return String(v);
  return (Math.round(v * 10) / 10).toFixed(1);
}

/** Human label from wellness_level enum. */
export function wellnessLevelLabel(level?: number | null): string {
  if (level == null) return '—';
  return WELLNESS_LEVEL_LABELS[level] ?? '—';
}

/** Ring fill 0–100 derived from wellness_level (SDK enum), not scaled index. */
export function wellnessLevelRingPercent(level?: number | null): number | null {
  if (level === 3) return 100;
  if (level === 2) return 66;
  if (level === 1) return 33;
  return null;
}

/** Status tier from SDK wellness_level. */
export function getWellnessStatusTierFromLevel(
  level?: number | null,
): 'good' | 'watch' | 'bad' {
  if (level === 3 || level === 2) return 'good';
  if (level === 1) return 'watch';
  return 'bad';
}

/** @deprecated P0: use formatWellnessIndexDisplay + wellnessLevelLabel */
export function formatWellnessDisplay(
  raw?: number | null,
  _wellnessLevel?: number | null,
): string {
  return formatWellnessIndexDisplay(raw);
}

/** @deprecated P0: use getWellnessIndexRaw */
export function normalizeWellnessIndex(
  raw?: number | null,
  _wellnessLevel?: number | null,
): number | null {
  return getWellnessIndexRaw(raw);
}

/** @deprecated P0: use getWellnessStatusTierFromLevel */
export function getWellnessStatusTier(normalized: number): 'good' | 'watch' | 'bad' {
  if (normalized >= 70) return 'good';
  if (normalized >= 40) return 'watch';
  return 'bad';
}
