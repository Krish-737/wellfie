import { statusColorToTier } from '../content/metricInterpretations';
import { MISSING_VALUE } from '../content/scanIndicators';

/** Uppercase badge labels for featured metric cards. */
export function formatMetricStatusBadge(label: string, statusColor: string): string {
  if (label === '—' || label === MISSING_VALUE) return '—';

  const tier = statusColorToTier(statusColor);
  const normalized = label.toLowerCase();

  if (tier === 'good') {
    if (normalized.includes('optimal') || normalized.includes('perfect')) return 'OPTIMAL';
    if (normalized.includes('good') || normalized.includes('healthy') || normalized.includes('normal')) {
      return 'NORMAL';
    }
    return 'NORMAL';
  }

  if (tier === 'watch') {
    if (normalized.includes('elevated') || normalized.includes('high')) return 'ELEVATED';
    if (normalized.includes('low')) return 'LOW';
    return 'MONITOR';
  }

  if (tier === 'bad') return 'ELEVATED';

  return label.toUpperCase();
}

/** Split display value string into primary number(s) and unit. */
export function splitMetricValue(raw: string): { primary: string; unit: string } {
  if (raw === MISSING_VALUE || raw === '—') {
    return { primary: '—', unit: '' };
  }

  const mmHgMatch = raw.match(/^(.+?)\s+(mmHg|bpm|ms|%|yrs?)$/i);
  if (mmHgMatch) {
    return {
      primary: mmHgMatch[1],
      unit: mmHgMatch[2].toUpperCase() === 'BPM' ? 'BPM' : mmHgMatch[2],
    };
  }

  const parts = raw.trim().split(/\s+/);
  if (parts.length >= 2) {
    const unit = parts[parts.length - 1];
    const primary = parts.slice(0, -1).join(' ');
    return { primary, unit: unit.toUpperCase() === 'BPM' ? 'BPM' : unit };
  }

  return { primary: raw, unit: '' };
}

export function statusBadgeChipClasses(statusColor: string): string {
  const tier = statusColorToTier(statusColor);
  if (tier === 'good') return 'text-emerald-800 bg-emerald-50 border-emerald-200/80';
  if (tier === 'watch') return 'text-amber-800 bg-amber-50 border-amber-200/80';
  if (tier === 'bad') return 'text-orange-800 bg-orange-50 border-orange-200/80';
  return 'text-slate-500 bg-slate-100 border-slate-200/80';
}

/** Decorative trend bars for v1 — last bar highlighted as current reading. */
export function placeholderTrendBars(): { heightPct: number; active: boolean }[] {
  const heights = [42, 58, 48, 72, 65, 88];
  return heights.map((heightPct, i) => ({
    heightPct,
    active: i === heights.length - 1,
  }));
}

export const DOMAIN_TAB_COLORS: Record<string, string> = {
  cardiovascular: '#2563eb',
  respiratory: '#0ea5e9',
  stress: '#d97706',
  recovery: '#0d9488',
  metabolic: '#dc2626',
  risk: '#475569',
};

export function domainTabColor(domainId: string, fallback = '#2563eb'): string {
  return DOMAIN_TAB_COLORS[domainId] ?? fallback;
}
