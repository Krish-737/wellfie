import {
  getIndicatorById,
  INDICATORS,
  MISSING_VALUE,
  type IndicatorDef,
  type ScanResult,
} from './scanIndicators';

export type DomainTier = 'strong' | 'balanced' | 'watch' | 'unknown';

export interface DomainScore {
  label: string;
  tier: DomainTier;
}

export interface HealthDomainDef {
  id: string;
  title: string;
  color: string;
  /** Matches `IndicatorDef.category` when grouping by category. */
  categoryKey?: string;
  /** Explicit metric ids when a domain spans a subset of a category. */
  indicatorIds?: readonly string[];
  headlineIds: readonly string[];
  isRisk?: boolean;
}

export const HEALTH_DOMAINS: readonly HealthDomainDef[] = [
  {
    id: 'cardiovascular',
    title: 'Cardiovascular',
    color: '#0f766e',
    categoryKey: 'Cardiovascular',
    headlineIds: ['pulse', 'bp', 'heart_age'],
  },
  {
    id: 'recovery',
    title: 'Recovery',
    color: '#7c3aed',
    categoryKey: 'HRV / Autonomic',
    headlineIds: ['sdnn', 'rmssd', 'pns'],
  },
  {
    id: 'stress',
    title: 'Stress',
    color: '#d97706',
    indicatorIds: ['stress_level', 'normalized_stress_index', 'stress_index'],
    headlineIds: ['stress_level', 'normalized_stress_index'],
  },
  {
    id: 'respiratory',
    title: 'Respiratory',
    color: '#0ea5e9',
    categoryKey: 'Respiratory',
    headlineIds: ['spo2', 'resp_rate'],
  },
  {
    id: 'metabolic',
    title: 'Metabolic',
    color: '#dc2626',
    categoryKey: 'Metabolic',
    headlineIds: ['hba1c', 'hemoglobin'],
  },
  {
    id: 'risk',
    title: 'Risk',
    color: '#334155',
    categoryKey: 'Risk Scores',
    headlineIds: ['ascvd', 'bp_risk'],
    isRisk: true,
  },
] as const;

const GOOD_STATUS_COLORS = new Set(['#0f766e']);
const WATCH_STATUS_COLORS = new Set(['#b45309']);
const BAD_STATUS_COLORS = new Set(['#dc2626']);

function metricTier(status: { label: string; color: string }): DomainTier | null {
  if (status.label === '—' || status.label === MISSING_VALUE) return null;
  if (BAD_STATUS_COLORS.has(status.color)) return 'watch';
  if (WATCH_STATUS_COLORS.has(status.color)) return 'balanced';
  if (GOOD_STATUS_COLORS.has(status.color)) return 'strong';
  return 'balanced';
}

export function getDomainIndicators(domain: HealthDomainDef): IndicatorDef[] {
  if (domain.indicatorIds?.length) {
    return domain.indicatorIds
      .map((id) => getIndicatorById(id))
      .filter((ind): ind is IndicatorDef => ind != null);
  }
  if (domain.categoryKey) {
    return INDICATORS.filter((ind) => ind.category === domain.categoryKey);
  }
  return [];
}

export function getDomainHeadlineIndicators(domain: HealthDomainDef): IndicatorDef[] {
  const all = getDomainIndicators(domain);
  const byId = new Map(all.map((ind) => [ind.id, ind]));
  const headlines = domain.headlineIds
    .map((id) => byId.get(id))
    .filter((ind): ind is IndicatorDef => ind != null);

  if (headlines.length > 0) return headlines;
  return all.slice(0, Math.min(3, all.length));
}

export function computeDomainScore(domain: HealthDomainDef, scan: ScanResult): DomainScore {
  const items = getDomainIndicators(domain);
  const tiers = items
    .map((ind) => {
      if (ind.getValue(scan) === MISSING_VALUE) return null;
      return metricTier(ind.getStatus(scan));
    })
    .filter((t): t is DomainTier => t != null);

  if (tiers.length === 0) {
    return { label: 'No data', tier: 'unknown' };
  }

  if (domain.isRisk) {
    if (tiers.some((t) => t === 'watch')) return { label: 'Elevated', tier: 'watch' };
    if (tiers.every((t) => t === 'strong')) return { label: 'Low risk', tier: 'strong' };
    return { label: 'Moderate', tier: 'balanced' };
  }

  if (tiers.some((t) => t === 'watch')) return { label: 'Needs attention', tier: 'watch' };
  if (tiers.every((t) => t === 'strong')) return { label: 'Strong', tier: 'strong' };
  return { label: 'Balanced', tier: 'balanced' };
}

export function getDomainScoreStyle(tier: DomainTier, accentColor: string): {
  color: string;
  background: string;
  border: string;
} {
  if (tier === 'strong') {
    return { color: '#0f766e', background: '#f0fdfa', border: '#99f6e4' };
  }
  if (tier === 'balanced') {
    return { color: '#b45309', background: '#fffbeb', border: '#fde68a' };
  }
  if (tier === 'watch') {
    return { color: '#dc2626', background: '#fef2f2', border: '#fecaca' };
  }
  return { color: '#64748b', background: `${accentColor}10`, border: '#e2e8f0' };
}
