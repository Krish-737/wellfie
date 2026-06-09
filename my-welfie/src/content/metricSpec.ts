/**
 * Shared metric specification loader (P2).
 * Source of truth: shared/metricSpec.json
 */

import specJson from '../../../shared/metricSpec.json';
import type { ScanResult } from './scanIndicators';

export interface MetricSpecEntry {
  id: string;
  label: string;
  category: string;
  enabledKey?: string;
  confidenceKey?: string;
  minDurationSec: number;
  webSupported: boolean;
  researchFlag: boolean;
  hasConfidence: boolean;
  completenessLabel: string;
  targetDisplay: string;
  pdfSection: string;
  requiresHealthProfile?: boolean;
}

export interface MetricSpecDisclaimers {
  wellness: string;
  sdkConfidence: string;
  research: string;
  webPlatform: string;
  missingValues: string;
  ascvdProfile: string;
}

export interface MetricSpec {
  version: string;
  disclaimers: MetricSpecDisclaimers;
  coreConfidenceKeys: { key: string; label: string }[];
  completenessIds: string[];
  metrics: MetricSpecEntry[];
}

export const METRIC_SPEC = specJson as MetricSpec;

const METRICS_BY_ID = new Map(METRIC_SPEC.metrics.map((m) => [m.id, m]));

export function getMetricSpec(id: string): MetricSpecEntry | undefined {
  return METRICS_BY_ID.get(id);
}

export type MetricBadgeKind = 'research' | 'mobile_only';

export interface MetricBadge {
  kind: MetricBadgeKind;
  label: string;
}

function scanPlatform(scan: ScanResult): string {
  return (scan.scan_platform ?? 'web').toLowerCase();
}

/** Compliance badges for metric cards (research *, mobile-only on web). */
export function getMetricBadges(indicatorId: string, scan: ScanResult): MetricBadge[] {
  const spec = getMetricSpec(indicatorId);
  if (!spec) return [];

  const badges: MetricBadge[] = [];

  if (spec.researchFlag) {
    badges.push({ kind: 'research', label: 'Research — not diagnostic' });
  }

  if (!spec.webSupported && scanPlatform(scan) === 'web') {
    badges.push({ kind: 'mobile_only', label: 'Mobile app only' });
  }

  return badges;
}

/** Availability slice used by metricAvailability.ts */
export function getAvailabilitySpec(id: string) {
  const m = getMetricSpec(id);
  if (!m) return undefined;
  return {
    enabledKey: m.enabledKey,
    confidenceKey: m.confidenceKey,
    minDurationSec: m.minDurationSec,
    webSupported: m.webSupported,
    completenessLabel: m.completenessLabel,
  };
}

export function buildAvailabilityMap(): Record<string, NonNullable<ReturnType<typeof getAvailabilitySpec>>> {
  const out: Record<string, NonNullable<ReturnType<typeof getAvailabilitySpec>>> = {};
  for (const m of METRIC_SPEC.metrics) {
    out[m.id] = {
      enabledKey: m.enabledKey,
      confidenceKey: m.confidenceKey,
      minDurationSec: m.minDurationSec,
      webSupported: m.webSupported,
      completenessLabel: m.completenessLabel,
    };
  }
  return out;
}
