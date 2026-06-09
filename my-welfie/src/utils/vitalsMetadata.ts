/** SDK confidenceLevel: 0=Unknown, 1=Low, 2=Medium, 3=High */

import type { EnabledVitalSigns } from '@biosensesignal/web-sdk';

export type SdkConfidenceLevel = 0 | 1 | 2 | 3;

export type SdkConfidenceLabel = 'Unknown' | 'Low' | 'Medium' | 'High';

export const SDK_CONFIDENCE_LABELS: Record<SdkConfidenceLevel, SdkConfidenceLabel> = {
  0: 'Unknown',
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

export function sdkConfidenceLabel(level?: number | null): SdkConfidenceLabel | null {
  if (level == null || level < 0 || level > 3) return null;
  return SDK_CONFIDENCE_LABELS[level as SdkConfidenceLevel];
}

export interface ScanVitalsMetadata {
  measurement_duration_sec?: number | null;
  scan_platform?: string | null;
  vitals_confidence?: Record<string, number> | null;
  vitals_enabled?: Record<string, boolean> | null;
}

export function serializeEnabledVitals(
  enabled?: EnabledVitalSigns | Record<string, boolean | undefined> | null,
): Record<string, boolean> | undefined {
  if (!enabled) return undefined;
  const out: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(enabled)) {
    if (typeof val === 'boolean') out[key] = val;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
