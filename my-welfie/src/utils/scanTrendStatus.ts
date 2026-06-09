import type { ScanResult } from '../content/scanIndicators';
import { getWellnessIndexRaw } from './wellnessScore';
import { toUtcDate } from './formatScanTime';

export type ScanTrendTier = 'excellent' | 'stable' | 'slight_drop' | 'unknown';

export interface ScanTrendStatus {
  label: string;
  color: string;
  tier: ScanTrendTier;
}

const GREEN = '#10b981';
const AMBER = '#f59e0b';
const MUTED = '#94a3b8';

export function getScanDisplayTitle(scannedAt: string, indexInList: number): string {
  if (indexInList === 0) return 'Full Body Scan';

  const hour = toUtcDate(scannedAt).getHours();
  if (hour < 12) return 'Morning Vitality Scan';

  return 'Wellness Check Scan';
}

export function getScanTrendStatus(
  scan: ScanResult,
  previousScan?: ScanResult | null,
): ScanTrendStatus {
  const score = getWellnessIndexRaw(scan.wellness_index);

  if (score == null) {
    return { label: '—', color: MUTED, tier: 'unknown' };
  }

  const prevScore = previousScan
    ? getWellnessIndexRaw(previousScan.wellness_index)
    : null;

  if (prevScore != null && score - prevScore <= -2) {
    return { label: 'SLIGHT DROP', color: AMBER, tier: 'slight_drop' };
  }

  if (scan.wellness_level === 3) {
    return { label: 'EXCELLENT', color: GREEN, tier: 'excellent' };
  }

  return { label: 'STABLE', color: GREEN, tier: 'stable' };
}

export function getScanDisplayScore(scan: ScanResult): string {
  const score = getWellnessIndexRaw(scan.wellness_index);
  if (score == null) return '—';
  return Number.isInteger(score) ? String(score) : String(Math.round(score * 10) / 10);
}
