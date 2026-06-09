import type { ScanResult } from '../content/scanIndicators';
import { extractMetricValue, type TrendMetricId } from './metricTrend';
import { formatCompactDelta, formatDeltaValue } from './metricDeltaFormat';
import type { RangeFeaturedMetricView } from './rangeFeaturedMetricView';

export type RecoveryContextView = RangeFeaturedMetricView & {
  targetLabel: string;
  deltaUnit: string;
  baselineText?: string | null;
  baselineImproved?: boolean;
  compactBaselineText?: string | null;
};
interface RecoveryRangeSpec {
  scaleMin: number;
  scaleMax: number;
  optimalMin?: number;
  optimalMax?: number;
  targetLabel: string;
  targetDisplay: string;
  scaleLeftLabel: string;
  scaleRightLabel: string;
  deltaUnit: string;
  extractValue(scan: ScanResult): number | null;
  trendMetricId?: TrendMetricId | null;
  /** Default: higher numeric value is better */
  higherIsBetter?: boolean;
  /** Compare delta by distance to optimal band (mean RRI, PRQ) */
  towardBand?: boolean;
  showBaseline?: boolean;
}

const RECOVERY_RANGE_SPECS: Record<string, RecoveryRangeSpec> = {
  sdnn: {
    scaleMin: 0,
    scaleMax: 80,
    optimalMin: 50,
    optimalMax: 80,
    targetLabel: '≥ 50 ms',
    targetDisplay: '>50MS',
    scaleLeftLabel: 'LOW',
    scaleRightLabel: 'HIGH',
    deltaUnit: 'ms',
    extractValue: (s) => s.sdnn ?? null,
    trendMetricId: 'sdnn',
    higherIsBetter: true,
  },
  rmssd: {
    scaleMin: 0,
    scaleMax: 60,
    optimalMin: 20,
    optimalMax: 43,
    targetLabel: '20 – 43 ms',
    targetDisplay: '20–43MS',
    scaleLeftLabel: 'LOW',
    scaleRightLabel: 'HIGH',
    deltaUnit: 'ms',
    extractValue: (s) => s.rmssd ?? null,
    trendMetricId: 'rmssd',
    higherIsBetter: true,
    showBaseline: true,
  },
  mean_rri: {
    scaleMin: 500,
    scaleMax: 1200,
    optimalMin: 700,
    optimalMax: 1000,
    targetLabel: '700 – 1000 ms',
    targetDisplay: '700–1000MS',
    scaleLeftLabel: 'BELOW',
    scaleRightLabel: 'ABOVE',
    deltaUnit: 'ms',
    extractValue: (s) => s.mean_rri ?? null,
    towardBand: true,
  },
  prq: {
    scaleMin: 2,
    scaleMax: 8,
    optimalMin: 4,
    optimalMax: 6,
    targetLabel: '~5 (normal 4 – 6)',
    targetDisplay: '4–6',
    scaleLeftLabel: 'LOW',
    scaleRightLabel: 'HIGH',
    deltaUnit: '',
    extractValue: (s) => s.prq ?? null,
    towardBand: true,
  },
};

function distanceToBand(value: number, optimalMin?: number, optimalMax?: number): number {
  if (optimalMin == null || optimalMax == null) return 0;
  if (value < optimalMin) return optimalMin - value;
  if (value > optimalMax) return value - optimalMax;
  return 0;
}

function computeScanDelta(  scansNewestFirst: ScanResult[],
  spec: RecoveryRangeSpec,
): { text: string; compactText: string; improved: boolean } | null {
  if (scansNewestFirst.length < 2) return null;

  const latest = scansNewestFirst[0];
  const previous = scansNewestFirst[1];
  const extract = spec.extractValue;

  const latestVal =
    spec.trendMetricId != null
      ? extractMetricValue(latest, spec.trendMetricId)
      : extract(latest);
  const prevVal =
    spec.trendMetricId != null
      ? extractMetricValue(previous, spec.trendMetricId)
      : extract(previous);

  if (latestVal == null || prevVal == null || Number.isNaN(latestVal) || Number.isNaN(prevVal)) {
    return null;
  }

  const delta = latestVal - prevVal;
  if (delta === 0) {
    return {
      text: 'Same as last scan',
      compactText: '→ Same',
      improved: true,
    };
  }

  let improved: boolean;
  if (spec.towardBand) {
    const latestDist = distanceToBand(latestVal, spec.optimalMin, spec.optimalMax);
    const prevDist = distanceToBand(prevVal, spec.optimalMin, spec.optimalMax);
    improved = latestDist < prevDist;
  } else {
    improved = spec.higherIsBetter ? delta > 0 : delta < 0;
  }

  const arrow = improved ? ' ↑' : ' ↓';
  return {
    text: `${formatDeltaValue(delta)} vs last scan${arrow}`,
    compactText: formatCompactDelta(delta, spec.deltaUnit, improved),
    improved,
  };
}

const BASELINE_SCAN_COUNT = 7;
const BASELINE_MIN_PRIOR = 3;

function computeBaselineDelta(
  scansNewestFirst: ScanResult[],
  extract: (s: ScanResult) => number | null,
): { text: string; compactText: string; improved: boolean } | null {
  const latestVal = extract(scansNewestFirst[0]);
  if (latestVal == null || Number.isNaN(latestVal)) return null;

  const priorValues = scansNewestFirst
    .slice(1, BASELINE_SCAN_COUNT + 1)
    .map(extract)
    .filter((v): v is number => v != null && !Number.isNaN(v));

  if (priorValues.length < BASELINE_MIN_PRIOR) return null;

  const avg = priorValues.reduce((sum, v) => sum + v, 0) / priorValues.length;
  if (avg === 0) return null;

  const pctChange = ((latestVal - avg) / avg) * 100;
  const rounded = Math.abs(pctChange) >= 10 ? Math.round(pctChange) : Math.round(pctChange * 10) / 10;
  const sign = pctChange > 0 ? '+' : '';
  // RMSSD: drops ≥20% vs baseline are clinically concerning
  const improved = pctChange > -20;
  const arrow = pctChange >= 0 ? ' ↑' : ' ↓';
  const pctArrow = pctChange >= 0 ? '↗' : '↘';

  return {
    text: `${sign}${rounded}% vs your recent avg${arrow}`,
    compactText: `${pctArrow} ${sign}${rounded}% avg`,
    improved,
  };
}

export function buildRecoveryFeaturedView(
  indicatorId: string,
  scan: ScanResult,
  scanHistory: ScanResult[],
): RangeFeaturedMetricView | null {
  const full = buildRecoveryContextView(indicatorId, scan, scanHistory);
  if (!full) return null;
  return {
    value: full.value,
    scaleMin: full.scaleMin,
    scaleMax: full.scaleMax,
    optimalMin: full.optimalMin,
    optimalMax: full.optimalMax,
    targetDisplay: full.targetDisplay,
    scaleLeftLabel: full.scaleLeftLabel,
    scaleRightLabel: full.scaleRightLabel,
    compactDeltaText: full.compactDeltaText,
    deltaImproved: full.deltaImproved,
    compactExtraText: full.compactBaselineText ?? null,
    extraImproved: full.baselineImproved,
  };
}

export function buildRecoveryContextView(
  indicatorId: string,
  scan: ScanResult,
  scanHistory: ScanResult[],
): RecoveryContextView | null {
  const spec = RECOVERY_RANGE_SPECS[indicatorId];
  if (!spec) return null;

  const value = spec.extractValue(scan);
  const delta = computeScanDelta(scanHistory, spec);
  const baseline =
    spec.showBaseline && scanHistory.length > 0
      ? computeBaselineDelta(scanHistory, spec.extractValue)
      : null;

  return {
    targetLabel: spec.targetLabel,
    targetDisplay: spec.targetDisplay,
    value,
    scaleMin: spec.scaleMin,
    scaleMax: spec.scaleMax,
    scaleLeftLabel: spec.scaleLeftLabel,
    scaleRightLabel: spec.scaleRightLabel,
    deltaUnit: spec.deltaUnit,
    optimalMin: spec.optimalMin,
    optimalMax: spec.optimalMax,
    compactDeltaText: delta?.compactText ?? null,
    deltaImproved: delta?.improved,
    compactExtraText: baseline?.compactText ?? null,
    extraImproved: baseline?.improved,
    baselineText: baseline?.text ?? null,
    baselineImproved: baseline?.improved,
    compactBaselineText: baseline?.compactText ?? null,
  };
}