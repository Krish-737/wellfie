import type { ScanResult } from '../content/scanIndicators';
import { getWellnessIndexRaw, getWellnessStatusTierFromLevel } from './wellnessScore';

export type ScanAnalysisStatusTier = 'optimal' | 'balanced' | 'attention' | 'unknown';

export interface ScanAnalysisStatus {
  label: string;
  tier: ScanAnalysisStatusTier;
  dotColor: string;
  textColor: string;
  background: string;
}

const STATUS_STYLES: Record<ScanAnalysisStatusTier, Omit<ScanAnalysisStatus, 'label' | 'tier'>> = {
  optimal: {
    dotColor: '#10b981',
    textColor: '#065f46',
    background: '#ecfdf5',
  },
  balanced: {
    dotColor: '#f59e0b',
    textColor: '#92400e',
    background: '#fffbeb',
  },
  attention: {
    dotColor: '#ef4444',
    textColor: '#991b1b',
    background: '#fef2f2',
  },
  unknown: {
    dotColor: '#94a3b8',
    textColor: '#64748b',
    background: '#f1f5f9',
  },
};

export function getScanAnalysisStatus(scan: ScanResult): ScanAnalysisStatus {
  const score = getWellnessIndexRaw(scan.wellness_index);

  let tier: ScanAnalysisStatusTier = 'unknown';
  let label = 'RESULTS AVAILABLE';

  if (score != null && scan.wellness_level != null) {
    const levelTier = getWellnessStatusTierFromLevel(scan.wellness_level);
    if (levelTier === 'good') {
      tier = scan.wellness_level === 3 ? 'optimal' : 'balanced';
      label = scan.wellness_level === 3 ? 'OPTIMAL STATUS' : 'NORMAL STATUS';
    } else if (levelTier === 'watch') {
      tier = 'balanced';
      label = 'BALANCED STATUS';
    } else {
      tier = 'attention';
      label = 'NEEDS ATTENTION';
    }
  } else if (score != null) {
    tier = 'balanced';
    label = 'RESULTS AVAILABLE';
  }

  return { tier, label, ...STATUS_STYLES[tier] };
}
