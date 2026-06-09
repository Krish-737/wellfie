/**
 * SDK-faithful missing-value reasons, scan completeness, and confidence aggregation (P1).
 * See my-welfie/docs/Important-Vital-Guide.md
 */

import {
  getIndicatorById,
  MISSING_VALUE,
  type ScanResult,
} from '../content/scanIndicators';
import { METRIC_SPEC } from '../content/metricSpec';
import { sdkConfidenceLabel, type SdkConfidenceLabel } from './vitalsMetadata';

export interface IndicatorAvailabilitySpec {
  enabledKey?: string;
  confidenceKey?: string;
  minDurationSec: number;
  webSupported: boolean;
  completenessLabel: string;
}

/** Derived from shared/metricSpec.json (P2). */
export const INDICATOR_AVAILABILITY: Record<string, IndicatorAvailabilitySpec> = Object.fromEntries(
  METRIC_SPEC.metrics.map((m) => [
    m.id,
    {
      enabledKey: m.enabledKey,
      confidenceKey: m.confidenceKey,
      minDurationSec: m.minDurationSec,
      webSupported: m.webSupported,
      completenessLabel: m.completenessLabel,
    },
  ]),
);

/** Core vitals checked for SDK confidence retake guidance. */
const CORE_CONFIDENCE_METRICS = METRIC_SPEC.coreConfidenceKeys;

const COMPLETENESS_INDICATOR_IDS = METRIC_SPEC.completenessIds as readonly string[];

export interface CompletenessItem {
  label: string;
  met: boolean;
  detail: string;
}

export interface SdkScanQuality {
  shouldRetake: boolean;
  retakeMessage: string | null;
  lowConfidenceMetrics: { label: string; level: SdkConfidenceLabel }[];
  completeness: CompletenessItem[];
  durationSec: number | null;
  platform: string;
}

export function indicatorHasValue(indicatorId: string, scan: ScanResult): boolean {
  const ind = getIndicatorById(indicatorId);
  if (!ind) return false;
  return ind.getValue(scan) !== MISSING_VALUE;
}

function scanPlatform(scan: ScanResult): string {
  return (scan.scan_platform ?? 'web').toLowerCase();
}

function isLicensed(spec: IndicatorAvailabilitySpec, scan: ScanResult): boolean {
  if (!spec.enabledKey || !scan.vitals_enabled) return true;
  return scan.vitals_enabled[spec.enabledKey] !== false;
}

function isPlatformSupported(spec: IndicatorAvailabilitySpec, scan: ScanResult): boolean {
  if (spec.webSupported) return true;
  return scanPlatform(scan) !== 'web';
}

function durationMet(spec: IndicatorAvailabilitySpec, scan: ScanResult): boolean {
  const duration = scan.measurement_duration_sec;
  if (duration == null) return true;
  return duration >= spec.minDurationSec;
}

/** Human-readable reason when an indicator value is missing. */
export function getIndicatorMissingReason(indicatorId: string, scan: ScanResult): string | null {
  if (indicatorHasValue(indicatorId, scan)) return null;

  const spec = INDICATOR_AVAILABILITY[indicatorId];
  if (!spec) return 'Not captured this scan';

  if (!isLicensed(spec, scan)) {
    return 'Not included in your license';
  }

  if (!isPlatformSupported(spec, scan)) {
    return 'Not available on web (mobile app only)';
  }

  const duration = scan.measurement_duration_sec;
  if (duration != null && duration < spec.minDurationSec) {
    return `Needs ≥${spec.minDurationSec}s scan (yours: ${Math.round(duration)}s)`;
  }

  return 'Not captured this scan';
}

/** Per-metric SDK confidence label when supported. */
export function getIndicatorConfidence(
  indicatorId: string,
  scan: ScanResult,
): SdkConfidenceLabel | null {
  const spec = INDICATOR_AVAILABILITY[indicatorId];
  if (!spec?.confidenceKey || !scan.vitals_confidence) return null;
  return sdkConfidenceLabel(scan.vitals_confidence[spec.confidenceKey]);
}

export function buildScanCompleteness(scan: ScanResult): CompletenessItem[] {
  return COMPLETENESS_INDICATOR_IDS.map((id) => {
    const spec = INDICATOR_AVAILABILITY[id];
    if (!spec) return { label: id, met: false, detail: 'Unknown' };

    if (indicatorHasValue(id, scan)) {
      return { label: spec.completenessLabel, met: true, detail: 'Captured' };
    }

    if (!isPlatformSupported(spec, scan)) {
      return { label: spec.completenessLabel, met: false, detail: 'Unavailable on web' };
    }

    if (!isLicensed(spec, scan)) {
      return { label: spec.completenessLabel, met: false, detail: 'Not in license' };
    }

    if (!durationMet(spec, scan)) {
      return {
        label: spec.completenessLabel,
        met: false,
        detail: `Needs ≥${spec.minDurationSec}s`,
      };
    }

    return { label: spec.completenessLabel, met: false, detail: 'Not captured' };
  });
}

/** Aggregate SDK confidence + completeness for post-scan banner. */
export function evaluateSdkScanQuality(scan: ScanResult): SdkScanQuality {
  const conf = scan.vitals_confidence ?? {};
  const lowConfidenceMetrics: SdkScanQuality['lowConfidenceMetrics'] = [];

  for (const { key, label } of CORE_CONFIDENCE_METRICS) {
    const level = conf[key];
    if (level == null || level === 0) continue;
    if (level < 3) {
      const confLabel = sdkConfidenceLabel(level);
      if (confLabel && confLabel !== 'Unknown') {
        lowConfidenceMetrics.push({ label, level: confLabel });
      }
    }
  }

  const shouldRetake = lowConfidenceMetrics.length > 0;
  const retakeMessage = shouldRetake
    ? 'Retake scan — one or more core vitals reported Low or Medium confidence. Follow BioSense best practices (steady face, good lighting, full duration).'
    : null;

  return {
    shouldRetake,
    retakeMessage,
    lowConfidenceMetrics,
    completeness: buildScanCompleteness(scan),
    durationSec: scan.measurement_duration_sec ?? null,
    platform: scanPlatform(scan),
  };
}

/** Extract confidence map from a live SDK vitals payload (post-scan monitor). */
export function extractConfidenceFromVitalsPayload(
  vitals: Record<string, unknown> | null | undefined,
): Record<string, number> {
  if (!vitals) return {};
  const out: Record<string, number> = {};
  for (const { key } of CORE_CONFIDENCE_METRICS) {
    const node = vitals[key];
    if (node && typeof node === 'object' && 'confidenceLevel' in node) {
      const level = (node as { confidenceLevel?: number }).confidenceLevel;
      if (typeof level === 'number') out[key] = level;
    }
  }
  return out;
}

/** Build a minimal ScanResult from live SDK output for post-scan quality UI. */
export function scanResultFromLiveVitals(
  vitals: Record<string, unknown>,
  opts: {
    durationSec: number;
    enabled?: Record<string, boolean> | null;
    platform?: string;
  },
): ScanResult {
  const num = (key: string) => {
    const node = vitals[key];
    if (node && typeof node === 'object' && 'value' in node) {
      const v = (node as { value?: unknown }).value;
      return typeof v === 'number' ? v : null;
    }
    return null;
  };

  const bpNode = vitals.bloodPressure as { value?: { systolic?: number; diastolic?: number } } | undefined;
  const bp = bpNode?.value;

  return {
    id: 'live',
    scanned_at: new Date().toISOString(),
    measurement_duration_sec: opts.durationSec,
    scan_platform: opts.platform ?? 'web',
    vitals_confidence: extractConfidenceFromVitalsPayload(vitals),
    vitals_enabled: opts.enabled ?? null,
    pulse_rate: num('pulseRate'),
    respiration_rate: num('respirationRate'),
    blood_pressure_systolic: bp?.systolic ?? null,
    blood_pressure_diastolic: bp?.diastolic ?? null,
    sdnn: num('sdnn'),
    rmssd: num('rmssd'),
    lfhf: num('lfhf'),
    stress_level: num('stressLevel'),
    stress_index: num('stressIndex'),
    normalized_stress_index: num('normalizedStressIndex'),
    wellness_index: num('wellnessIndex'),
    wellness_level: num('wellnessLevel'),
  };
}
