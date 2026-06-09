import { getIndicatorById, type ScanResult } from '../content/scanIndicators';
import { getMetricSpec } from '../content/metricSpec';
import { getIndicatorConfidence } from './metricAvailability';
import { toUtcDate } from './formatScanTime';
import { getWellnessIndexRaw } from './wellnessScore';
import type { SdkConfidenceLabel } from './vitalsMetadata';

export type TrendWindow = 5 | 10 | 20;

export type TrendMetricId =
  | 'wellness'
  | 'pulse'
  | 'bp_systolic'
  | 'spo2'
  | 'sdnn'
  | 'rmssd'
  | 'normalized_stress'
  | 'resp_rate';

export interface TrendMetricConfig {
  id: TrendMetricId;
  label: string;
  unit: string;
  color: string;
  higherIsBetter: boolean;
  fixedRange?: { min: number; max: number };
  indicatorId: string;
  /** From shared metricSpec — SDK reports confidence for this trend metric. */
  hasConfidence: boolean;
}

function trendConfig(
  base: Omit<TrendMetricConfig, 'hasConfidence'>,
): TrendMetricConfig {
  return {
    ...base,
    hasConfidence: getMetricSpec(base.indicatorId)?.hasConfidence ?? false,
  };
}

export const DEFAULT_TREND_METRIC: TrendMetricId = 'wellness';

export const TREND_METRICS: readonly TrendMetricConfig[] = [
  trendConfig({
    id: 'wellness',
    label: 'Vitality',
    unit: '',
    color: '#14b8a6',
    higherIsBetter: true,
    indicatorId: 'wellness',
  }),
  trendConfig({
    id: 'pulse',
    label: 'Pulse Rate',
    unit: 'bpm',
    color: '#2563eb',
    higherIsBetter: false,
    indicatorId: 'pulse',
  }),
  trendConfig({
    id: 'bp_systolic',
    label: 'BP (Systolic)',
    unit: 'mmHg',
    color: '#2563eb',
    higherIsBetter: false,
    indicatorId: 'bp',
  }),
  trendConfig({
    id: 'spo2',
    label: 'SpO₂',
    unit: '%',
    color: '#0ea5e9',
    higherIsBetter: true,
    fixedRange: { min: 90, max: 100 },
    indicatorId: 'spo2',
  }),
  trendConfig({
    id: 'sdnn',
    label: 'SDNN',
    unit: 'ms',
    color: '#7c3aed',
    higherIsBetter: true,
    indicatorId: 'sdnn',
  }),
  trendConfig({
    id: 'rmssd',
    label: 'RMSSD',
    unit: 'ms',
    color: '#7c3aed',
    higherIsBetter: true,
    indicatorId: 'rmssd',
  }),
  trendConfig({
    id: 'normalized_stress',
    label: 'Normalized Stress',
    unit: '%',
    color: '#d97706',
    higherIsBetter: false,
    fixedRange: { min: 0, max: 100 },
    indicatorId: 'normalized_stress_index',
  }),
  trendConfig({
    id: 'resp_rate',
    label: 'Respiration Rate',
    unit: 'br/min',
    color: '#0ea5e9',
    higherIsBetter: false,
    indicatorId: 'resp_rate',
  }),
] as const;

export const TREND_WINDOWS: readonly TrendWindow[] = [5, 10, 20];

export function getTrendMetricConfig(id: TrendMetricId): TrendMetricConfig {
  return TREND_METRICS.find((m) => m.id === id) ?? TREND_METRICS[0];
}

/** Map featured-card indicator ids to trend metrics when available. */
export function trendMetricIdForIndicator(indicatorId: string): TrendMetricId | null {
  const match = TREND_METRICS.find((m) => m.indicatorId === indicatorId);
  return match?.id ?? null;
}

export function extractMetricValue(scan: ScanResult, metricId: TrendMetricId): number | null {
  switch (metricId) {
    case 'wellness':
      return getWellnessIndexRaw(scan.wellness_index);
    case 'pulse':
      return scan.pulse_rate ?? null;
    case 'bp_systolic':
      return scan.blood_pressure_systolic ?? null;
    case 'spo2':
      return scan.oxygen_saturation ?? null;
    case 'sdnn':
      return scan.sdnn ?? null;
    case 'rmssd':
      return scan.rmssd ?? null;
    case 'normalized_stress':
      return scan.normalized_stress_index ?? null;
    case 'resp_rate':
      return scan.respiration_rate ?? null;
    default:
      return null;
  }
}

export interface TrendPoint {
  scanId: string;
  scannedAt: string;
  value: number;
  xLabel: string;
  isLatest: boolean;
  statusLabel: string;
  deltaFromPrevious: number | null;
  /** SDK confidence when metric supports it (P3). */
  confidenceLabel: SdkConfidenceLabel | null;
}

export interface TrendStats {
  latest: number | null;
  previous: number | null;
  change: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
  validCount: number;
  totalInWindow: number;
  /** Scans in series with Low or Medium SDK confidence. */
  lowConfidenceCount: number;
}

export interface MetricTrendSeries {
  metric: TrendMetricConfig;
  window: TrendWindow;
  points: TrendPoint[];
  stats: TrendStats;
  yMin: number;
  yMax: number;
}

function compactScanLabel(iso: string, isLatest: boolean): string {
  if (isLatest) return 'Latest';
  const date = toUtcDate(iso);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function computeYRange(
  values: number[],
  config: TrendMetricConfig,
): { yMin: number; yMax: number } {
  if (config.fixedRange) {
    return { yMin: config.fixedRange.min, yMax: config.fixedRange.max };
  }

  if (values.length === 0) {
    return { yMin: 0, yMax: 100 };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(Math.abs(max) * 0.1, 1);
  const pad = span * 0.15;

  return {
    yMin: Math.floor(min - pad),
    yMax: Math.ceil(max + pad),
  };
}

export function buildMetricTrendSeries(
  scansNewestFirst: ScanResult[],
  metricId: TrendMetricId,
  window: TrendWindow,
): MetricTrendSeries {
  const metric = getTrendMetricConfig(metricId);
  const windowScans = scansNewestFirst.slice(0, window);
  const chronological = [...windowScans].reverse();

  const rawPoints = chronological.map((scan, index) => {
    const value = extractMetricValue(scan, metricId);
    const isLatest = index === chronological.length - 1;
    const indicator = getIndicatorById(metric.indicatorId);
    const statusLabel = indicator ? indicator.getStatus(scan).label : '—';

    return {
      scan,
      value,
      isLatest,
      statusLabel,
    };
  });

  const validValues = rawPoints
    .map((p) => p.value)
    .filter((v): v is number => v != null && !Number.isNaN(v));

  let previousValue: number | null = null;
  let lowConfidenceCount = 0;
  const points: TrendPoint[] = [];

  for (const p of rawPoints) {
    if (p.value == null || Number.isNaN(p.value)) continue;

    const deltaFromPrevious =
      previousValue != null ? p.value - previousValue : null;
    previousValue = p.value;

    const confidenceLabel = metric.hasConfidence
      ? getIndicatorConfidence(metric.indicatorId, p.scan)
      : null;

    if (confidenceLabel === 'Low' || confidenceLabel === 'Medium') {
      lowConfidenceCount += 1;
    }

    points.push({
      scanId: p.scan.id,
      scannedAt: p.scan.scanned_at,
      value: p.value,
      xLabel: compactScanLabel(p.scan.scanned_at, p.isLatest),
      isLatest: p.isLatest,
      statusLabel: p.statusLabel,
      deltaFromPrevious,
      confidenceLabel,
    });
  }

  const latest = validValues.length > 0 ? validValues[validValues.length - 1] : null;
  const previous = validValues.length > 1 ? validValues[validValues.length - 2] : null;
  const change = latest != null && previous != null ? latest - previous : null;
  const average =
    validValues.length > 0
      ? validValues.reduce((a, b) => a + b, 0) / validValues.length
      : null;

  const { yMin, yMax } = computeYRange(validValues, metric);

  return {
    metric,
    window,
    points,
    stats: {
      latest,
      previous,
      change,
      average,
      min: validValues.length ? Math.min(...validValues) : null,
      max: validValues.length ? Math.max(...validValues) : null,
      validCount: validValues.length,
      totalInWindow: windowScans.length,
      lowConfidenceCount,
    },
    yMin,
    yMax,
  };
}

export function formatTrendValue(value: number, metric: TrendMetricConfig): string {
  if (metric.id === 'wellness') return String(Math.round(value));
  if (metric.id === 'spo2') return value.toFixed(1);
  return String(Math.round(value));
}

export function formatTrendDelta(
  delta: number,
  metric: TrendMetricConfig,
): { text: string; isPositive: boolean } {
  const rounded = metric.id === 'wellness' ? Math.round(delta) : Math.round(delta * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  const improved = metric.higherIsBetter ? rounded > 0 : rounded < 0;
  const worsened = metric.higherIsBetter ? rounded < 0 : rounded > 0;

  let suffix = '';
  if (improved) suffix = ' ↑';
  else if (worsened) suffix = ' ↓';

  return {
    text: `${sign}${rounded}${suffix}`,
    isPositive: improved,
  };
}

/** Chart ring color for SDK confidence on trend points (P3). */
export function trendConfidenceRingColor(
  label: SdkConfidenceLabel | null,
): string | null {
  if (label === 'Low') return '#ef4444';
  if (label === 'Medium') return '#f59e0b';
  return null;
}

export function isLowSdkConfidence(label: SdkConfidenceLabel | null): boolean {
  return label === 'Low' || label === 'Medium';
}

/** Sparkline bar heights (0–100) for featured metric cards. */
export function buildSparklineBars(
  scansNewestFirst: ScanResult[],
  metricId: TrendMetricId,
  count = 6,
): { heightPct: number; active: boolean }[] {
  const take = Math.min(count, scansNewestFirst.length, 20);
  const windowSize = (take <= 5 ? 5 : take <= 10 ? 10 : 20) as TrendWindow;
  const series = buildMetricTrendSeries(scansNewestFirst, metricId, windowSize);
  const values = series.points.map((p) => p.value).slice(-count);

  if (values.length === 0) {
    return Array.from({ length: count }, (_, i) => ({
      heightPct: 30 + (i % 3) * 10,
      active: i === count - 1,
    }));
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const padded: (number | null)[] = Array(Math.max(0, count - values.length)).fill(null);
  const combined = [...padded, ...values].slice(-count);

  return combined.map((v, i) => ({
    heightPct: v == null ? 20 : 25 + ((v - min) / span) * 75,
    active: i === combined.length - 1 && v != null,
  }));
}
