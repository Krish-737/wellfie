import { computeDomainScore, HEALTH_DOMAINS } from '../content/healthDomains';
import { INDICATORS, MISSING_VALUE, type ScanResult } from '../content/scanIndicators';
import { evaluateSdkScanQuality, type SdkScanQuality } from './metricAvailability';
import { getWellnessIndexRaw, getWellnessStatusTierFromLevel } from './wellnessScore';
import type { SdkConfidenceLabel } from './vitalsMetadata';

const CORE_INDICATOR_IDS = ['pulse', 'bp', 'spo2', 'sdnn', 'wellness', 'stress_level'] as const;

export type ConfidenceLabel = SdkConfidenceLabel;

export interface ScanConfidence {
  pct: number;
  label: ConfidenceLabel;
  populated: number;
  total: number;
}

/** @deprecated Use evaluateSdkScanQuality — field-count heuristic, not SDK confidence. */
export function computeScanConfidence(scan: ScanResult): ScanConfidence {
  const populated = INDICATORS.filter((ind) => ind.getValue(scan) !== MISSING_VALUE).length;
  const total = INDICATORS.length;
  const pct = total === 0 ? 0 : Math.round((populated / total) * 100);

  const coreFilled = CORE_INDICATOR_IDS.filter((id) => {
    const ind = INDICATORS.find((i) => i.id === id);
    return ind != null && ind.getValue(scan) !== MISSING_VALUE;
  }).length;

  let label: ConfidenceLabel = 'Low';
  if (pct >= 85 && coreFilled >= 5) label = 'High';
  else if (pct >= 60) label = 'Medium';

  return { pct, label, populated, total };
}

/** SDK-based scan quality (P1). Prefer over computeScanConfidence. */
export { evaluateSdkScanQuality, type SdkScanQuality };

export function confidenceBarColor(label: ConfidenceLabel): string {
  if (label === 'High') return '#14b8a6';
  if (label === 'Medium') return '#f59e0b';
  return '#ef4444';
}

/** Maps 0–100% to a red (0°) → green (120°) hue for confidence UI. */
export function confidenceHueColor(pct: number): string {
  const clamped = Math.min(100, Math.max(0, pct));
  const hue = (clamped / 100) * 120;
  return `hsl(${hue}, 72%, 44%)`;
}

export const CONFIDENCE_GRADIENT = 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%)';

export function generateHealthSummary(scan: ScanResult): string {
  const domains = HEALTH_DOMAINS.map((domain) => ({
    title: domain.title,
    ...computeDomainScore(domain, scan),
  }));

  const strong = domains.filter((d) => d.tier === 'strong').map((d) => d.title.toLowerCase());
  const watch = domains.filter((d) => d.tier === 'watch').map((d) => d.title.toLowerCase());

  const score = getWellnessIndexRaw(scan.wellness_index);
  const levelTier = getWellnessStatusTierFromLevel(scan.wellness_level);
  let opener: string;
  if (score == null) {
    opener = 'Your latest scan captured partial data.';
  } else if (levelTier === 'good') {
    opener = 'Overall wellness looks solid today.';
  } else if (levelTier === 'watch') {
    opener = 'Your wellness score suggests room to optimize recovery and stress.';
  } else {
    opener = 'Several signals suggest prioritizing rest and follow-up with your care team.';
  }

  const strengths = strong.length
    ? `${strong.slice(0, 2).join(' and ')} ${strong.length === 1 ? 'looks' : 'look'} strong.`
    : '';

  let action = '';
  if (watch.length) {
    action = `${watch[0]} may need attention — consider lighter activity and better sleep tonight.`;
  } else if (strong.length >= 3) {
    action = 'Keep your current routine — consistency drives the best trends.';
  }

  return [opener, strengths, action].filter(Boolean).join(' ');
}
