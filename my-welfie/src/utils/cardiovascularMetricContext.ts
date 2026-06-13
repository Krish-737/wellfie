import type { ScanResult } from '../content/scanIndicators';
import { extractMetricValue, type TrendMetricId } from './metricTrend';
import { formatCompactDelta, formatDeltaValue } from './metricDeltaFormat';
import type { RangeFeaturedMetricView } from './rangeFeaturedMetricView';

export function clampPct(value: number, min: number, max: number): number {
  if (max <= min) return 50;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

interface CardioRangeSpec {
  scaleMin: number;
  scaleMax: number;
  optimalMin?: number;
  optimalMax?: number;
  targetDisplay?: string;
  scaleLeftLabel: string;
  scaleRightLabel: string;
  deltaUnit: string;
  extractValue(scan: ScanResult): number | null;
  trendMetricId?: TrendMetricId | null;
  higherIsBetter?: boolean;
  towardBand?: boolean;
  /** When no target band (e.g. heart age without profile age), lower value = improved */
  lowerIsBetterWithoutBand?: boolean;
}

const CARDIO_RANGE_SPECS: Record<string, CardioRangeSpec> = {
  pulse: {
    scaleMin: 40,
    scaleMax: 120,
    optimalMin: 60,
    optimalMax: 100,
    targetDisplay: '60–100BPM',
    scaleLeftLabel: 'LOW',
    scaleRightLabel: 'HIGH',
    deltaUnit: 'bpm',
    extractValue: (s) => s.pulse_rate ?? null,
    trendMetricId: 'pulse',
    towardBand: true,
  },
  bp: {
    scaleMin: 90,
    scaleMax: 160,
    optimalMin: 90,
    optimalMax: 119,
    targetDisplay: '<120/80',
    scaleLeftLabel: 'LOW',
    scaleRightLabel: 'HIGH',
    deltaUnit: 'mmHg',
    extractValue: (s) => s.blood_pressure_systolic ?? null,
    trendMetricId: 'bp_systolic',
    towardBand: true,
  },
  pulse_pressure: {
    scaleMin: 15,
    scaleMax: 70,
    optimalMin: 25,
    optimalMax: 50,
    targetDisplay: '25–50MMHG',
    scaleLeftLabel: 'LOW',
    scaleRightLabel: 'HIGH',
    deltaUnit: 'mmHg',
    extractValue: (s) => s.pulse_pressure ?? null,
    towardBand: true,
  },
  map: {
    scaleMin: 60,
    scaleMax: 110,
    optimalMin: 70,
    optimalMax: 100,
    targetDisplay: '70–100MMHG',
    scaleLeftLabel: 'LOW',
    scaleRightLabel: 'HIGH',
    deltaUnit: 'mmHg',
    extractValue: (s) => s.mean_arterial_pressure ?? null,
    towardBand: true,
  },
  cardiac_workload: {
    scaleMin: 3,
    scaleMax: 5,
    optimalMin: 3.9,
    optimalMax: 4.2,
    targetDisplay: '3.9–4.2',
    scaleLeftLabel: 'LOW',
    scaleRightLabel: 'HIGH',
    deltaUnit: '',
    extractValue: (s) => s.cardiac_workload ?? null,
    towardBand: true,
  },
  heart_age: {
    scaleMin: 20,
    scaleMax: 80,
    scaleLeftLabel: 'LOW',
    scaleRightLabel: 'HIGH',
    deltaUnit: 'yrs',
    extractValue: (s) => s.heart_age ?? null,
    towardBand: true,
    lowerIsBetterWithoutBand: true,
  },
};

function distanceToBand(value: number, optimalMin?: number, optimalMax?: number): number {
  if (optimalMin == null || optimalMax == null) return 0;
  if (value < optimalMin) return optimalMin - value;
  if (value > optimalMax) return value - optimalMax;
  return 0;
}

function computeScanDelta(
  scansNewestFirst: ScanResult[],
  spec: CardioRangeSpec,
): { compactText: string; improved: boolean } | null {
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
  if (delta === 0) return { compactText: '→ Same', improved: true };

  let improved: boolean;
  const hasBand = spec.optimalMin != null && spec.optimalMax != null;
  if (spec.towardBand && hasBand) {
    const latestDist = distanceToBand(latestVal, spec.optimalMin, spec.optimalMax);
    const prevDist = distanceToBand(prevVal, spec.optimalMin, spec.optimalMax);
    improved = latestDist < prevDist;
  } else if (spec.lowerIsBetterWithoutBand) {
    improved = delta < 0;
  } else {
    improved = spec.higherIsBetter ? delta > 0 : delta < 0;
  }

  return {
    compactText: formatCompactDelta(delta, spec.deltaUnit, improved),
    improved,
  };
}

export function buildCardioFeaturedView(
  indicatorId: string,
  scan: ScanResult,
  scanHistory: ScanResult[],
  userAge?: number | null,
): RangeFeaturedMetricView | null {
  const spec = CARDIO_RANGE_SPECS[indicatorId];
  if (!spec) return null;

  const value = spec.extractValue(scan);

  let scaleMin = spec.scaleMin;
  let scaleMax = spec.scaleMax;
  let optimalMin = spec.optimalMin;
  let optimalMax = spec.optimalMax;
  let targetDisplay: string | null | undefined = spec.targetDisplay;
  let compactExtraText: string | null = null;
  let extraImproved: boolean | undefined;

  if (indicatorId === 'bp') {
    const dia = scan.blood_pressure_diastolic;
    if (dia != null) {
      compactExtraText = `Dia ${Math.round(dia)} mmHg (target <80)`;
      extraImproved = dia < 80;
    }
  }

  // if (indicatorId === 'heart_age') {
  //   if (userAge != null && value != null) {
  //     scaleMin = Math.max(18, userAge - 15);
  //     scaleMax = userAge + 20;
  //     optimalMin = userAge - 2;
  //     optimalMax = userAge + 2;
  //     targetDisplay = 'MATCH AGE';
  //     const diff = Math.round(value - userAge);
  //     if (diff === 0) {
  //       compactExtraText = 'Matches your age';
  //       extraImproved = true;
  //     } else if (diff > 0) {
  //       compactExtraText = `${diff} yrs above age ${userAge}`;
  //       extraImproved = false;
  //     } else {
  //       compactExtraText = `${Math.abs(diff)} yrs below age ${userAge}`;
  //       extraImproved = true;
  //     }
  //   } else {
  //     optimalMin = undefined;
  //     optimalMax = undefined;
  //     targetDisplay = null;
  //   }
  // }
  if (indicatorId === 'heart_age') {
    if (userAge != null && value != null) {
      scaleMin = Math.max(18, userAge - 15);
      scaleMax = userAge + 20;
      optimalMin = userAge - 2;
      optimalMax = userAge + 2;
      targetDisplay = `MATCH AGE ${userAge}`;
      const diff = Math.round(value - userAge);
      if (diff === 0) {
        compactExtraText = `Heart age matches your age of ${userAge}`;
        extraImproved = true;
      } else if (diff > 0) {
        compactExtraText = `${diff} yrs older than your age (${userAge})`;
        extraImproved = false;
      } else {
        compactExtraText = `${Math.abs(diff)} yrs younger than your age (${userAge})`;
        extraImproved = true;
      }
    } else {
      // No profile age — show the bar without a target band, prompt user to add profile
      optimalMin = undefined;
      optimalMax = undefined;
      targetDisplay = 'NO_PROFILE';   // sentinel — card renders a nudge instead
    }
  }

  const deltaSpec: CardioRangeSpec = {
    ...spec,
    optimalMin,
    optimalMax,
  };
  const delta = computeScanDelta(scanHistory, deltaSpec);

  return {
    value,
    scaleMin,
    scaleMax,
    optimalMin,
    optimalMax,
    targetDisplay: targetDisplay ?? null,
    scaleLeftLabel: spec.scaleLeftLabel,
    scaleRightLabel: spec.scaleRightLabel,
    compactDeltaText: delta?.compactText ?? null,
    deltaImproved: delta?.improved,
    compactExtraText,
    extraImproved,
  };
}

/** @deprecated Use buildCardioFeaturedView */
export function buildCardioContextView(
  indicatorId: string,
  scan: ScanResult,
  scanHistory: ScanResult[],
  userAge?: number | null,
): RangeFeaturedMetricView | null {
  return buildCardioFeaturedView(indicatorId, scan, scanHistory, userAge);
}
