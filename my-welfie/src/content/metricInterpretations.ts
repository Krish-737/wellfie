import { MISSING_VALUE, type IndicatorDef, type ScanResult } from './scanIndicators';
import { getIndicatorMissingReason } from '../utils/metricAvailability';

export type InterpretationTier = 'good' | 'watch' | 'bad' | 'neutral';

const GOOD_COLOR = '#0f766e';
const WATCH_COLOR = '#b45309';
const BAD_COLOR = '#dc2626';

export function statusColorToTier(color: string): InterpretationTier {
  if (color === GOOD_COLOR) return 'good';
  if (color === WATCH_COLOR) return 'watch';
  if (color === BAD_COLOR) return 'bad';
  return 'neutral';
}

const INTERPRETATIONS: Record<string, Partial<Record<InterpretationTier, string>>> = {
  pulse: {
    good: 'Resting rate is in a healthy range for most adults.',
    watch: 'Slightly outside optimal — track over several scans.',
    bad: 'Unusually high or low — discuss with your care team if persistent.',
  },
  bp: {
    good: 'Readings suggest healthy vascular pressure today.',
    watch: 'Borderline elevation — lifestyle and repeat checks help.',
    bad: 'Elevated pressure — confirm with follow-up readings.',
  },
  pulse_pressure: {
    good: 'Pulse pressure is within a typical healthy range.',
    watch: 'Wider or narrower than ideal — worth monitoring.',
  },
  map: {
    good: 'Mean arterial pressure looks balanced.',
    watch: 'MAP is outside the usual range — monitor trends.',
  },
  cardiac_workload: {
    good: 'Heart workload appears moderate for this reading.',
    watch: 'Higher workload detected — rest and hydration may help.',
  },
  heart_age: {
    good: 'Heart age aligns well with your profile.',
    watch: 'Heart age reads above chronological — focus on cardio health.',
  },
  resp_rate: {
    good: 'Breathing rate is calm and within normal range.',
    watch: 'Slightly fast or slow — recheck when fully at rest.',
    bad: 'Abnormal breathing rate — seek care if you feel unwell.',
  },
  spo2: {
    good: 'Oxygen saturation looks strong.',
    watch: 'Slightly lower than optimal — ensure good lighting on rescans.',
    bad: 'Low SpO₂ proxy — verify with clinical measurement if concerned.',
  },
  sdnn: {
    good: 'HRV variability suggests solid autonomic balance.',
    watch: 'HRV is moderate — sleep and recovery may improve it.',
    bad: 'Low HRV — prioritize rest and stress management.',
  },
  rmssd: {
    good: 'Parasympathetic activity looks healthy.',
    watch: 'Recovery markers are moderate today.',
    bad: 'Reduced recovery signal — lighter training may help.',
  },
  mean_rri: {
    good: 'Beat-to-beat timing is stable.',
    watch: 'Interval variability is average — consistency helps trends.',
  },
  lfhf: {
    good: 'Sympathetic–parasympathetic balance looks favorable.',
    watch: 'Autonomic ratio is shifted — stress or fatigue may play a role.',
  },
  prq: {
    good: 'Cardiorespiratory coupling appears coordinated.',
    watch: 'Coupling is moderate — deep breathing may improve readings.',
  },
  pns: {
    good: 'Parasympathetic tone supports recovery.',
    watch: 'Recovery branch is moderate — rest when you can.',
  },
  sns: {
    good: 'Stress branch activity looks calm.',
    watch: 'Sympathetic activity is elevated — try relaxation techniques.',
  },
  stress_level: {
    good: 'Stress level reads low to normal today.',
    watch: 'Elevated stress — mindfulness or breaks may help.',
    bad: 'High stress signal — prioritize recovery and support.',
  },
  stress_index: {
    good: 'Autonomic stress load is manageable.',
    watch: 'Stress index is elevated — watch sleep and workload.',
    bad: 'Significant stress load detected — consider lifestyle adjustments.',
  },
  normalized_stress_index: {
    good: 'Normalized stress is in a healthy range for comparison.',
    watch: 'Elevated normalized stress — monitor recovery and workload.',
    bad: 'High normalized stress — prioritise rest and stress reduction.',
  },
  wellness: {
    good: 'Composite wellness score reflects strong overall balance.',
    watch: 'Room to improve — focus on sleep, movement, and stress.',
    bad: 'Lower wellness score — review key metrics with your clinician.',
  },
  wellness_level: {
    good: 'Wellness level reads Normal or High.',
    watch: 'Wellness level is Low — room to improve key habits.',
    bad: 'Wellness level is Low — review metrics with your care team.',
  },
  hba1c: {
    good: 'Estimated glycemic marker is in a favorable range.',
    watch: 'Borderline elevation — diet and activity matter.',
    bad: 'Higher proxy reading — confirm with lab testing.',
  },
  hemoglobin: {
    good: 'Hemoglobin proxy suggests adequate oxygen-carrying capacity.',
    watch: 'Borderline reading — nutrition and follow-up may help.',
    bad: 'Low proxy signal — clinical labs can confirm.',
  },
  ascvd: {
    good: 'Cardiovascular risk estimate is low for this session.',
    watch: 'Moderate risk proxy — lifestyle factors are key.',
    bad: 'Elevated risk proxy — discuss prevention with your doctor.',
  },
  bp_risk: {
    good: 'Blood pressure risk estimate is low.',
    watch: 'Moderate BP risk proxy — monitor and manage lifestyle.',
    bad: 'Higher BP risk signal — clinical follow-up recommended.',
  },
  glucose_risk: {
    good: 'Glucose risk proxy reads low.',
    watch: 'Moderate glucose risk — diet and activity help.',
    bad: 'Elevated glucose risk proxy — lab confirmation advised.',
  },
  cholesterol_risk: {
    good: 'Cholesterol risk proxy is low.',
    watch: 'Moderate cholesterol risk — heart-healthy habits help.',
    bad: 'Higher cholesterol risk proxy — lipid panel recommended.',
  },
};

const TIER_FALLBACK: Record<InterpretationTier, string> = {
  good: 'This reading looks favorable for general wellness.',
  watch: 'Worth watching — compare with your recent scan trend.',
  bad: 'Outside optimal range — follow up if this pattern continues.',
  neutral: 'Complete a scan to capture this metric.',
};

export function getMetricInterpretation(indicator: IndicatorDef, scan: ScanResult): string {
  const value = indicator.getValue(scan);
  if (value === MISSING_VALUE) {
    const reason = getIndicatorMissingReason(indicator.id, scan);
    if (reason) return reason;
    return INTERPRETATIONS[indicator.id]?.neutral ?? TIER_FALLBACK.neutral;
  }

  const status = indicator.getStatus(scan);
  const tier = statusColorToTier(status.color);
  const specific = INTERPRETATIONS[indicator.id]?.[tier];
  if (specific) return specific;

  return TIER_FALLBACK[tier];
}

export function statusChipClasses(color: string): string {
  const tier = statusColorToTier(color);
  if (tier === 'good') {
    return 'text-teal-800 bg-teal-50 border-teal-200/80';
  }
  if (tier === 'watch') {
    return 'text-amber-800 bg-amber-50 border-amber-200/80';
  }
  if (tier === 'bad') {
    return 'text-red-700 bg-red-50 border-red-200/80';
  }
  return 'text-slate-500 bg-slate-100 border-slate-200/80';
}
