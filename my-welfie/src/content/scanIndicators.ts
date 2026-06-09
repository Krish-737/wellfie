/** Shared scan metric definitions — used by dashboard summary and health indicators. */

import {
  formatWellnessIndexDisplay,
  getWellnessIndexRaw,
  getWellnessStatusTierFromLevel,
  wellnessLevelLabel,
} from '../utils/wellnessScore';

export interface ScanResult {
  id: string;
  scanned_at: string;
  pulse_rate?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  pulse_pressure?: number | null;
  mean_arterial_pressure?: number | null;
  cardiac_workload?: number | null;
  heart_age?: number | null;
  respiration_rate?: number | null;
  oxygen_saturation?: number | null;
  sdnn?: number | null;
  rmssd?: number | null;
  mean_rri?: number | null;
  lfhf?: number | null;
  prq?: number | null;
  pns_index?: number | null;
  pns_zone?: number | null;
  sns_index?: number | null;
  sns_zone?: number | null;
  stress_level?: number | null;
  stress_index?: number | null;
  normalized_stress_index?: number | null;
  wellness_level?: number | null;
  wellness_index?: number | null;
  hemoglobin?: number | null;
  hemoglobin_a1c?: number | null;
  high_blood_pressure_risk?: number | null;
  high_hemoglobin_a1c_risk?: number | null;
  high_fasting_glucose_risk?: number | null;
  high_total_cholesterol_risk?: number | null;
  low_hemoglobin_risk?: number | null;
  ascvd_risk?: number | null;
  ascvd_risk_level?: number | null;
  measurement_duration_sec?: number | null;
  scan_platform?: string | null;
  vitals_confidence?: Record<string, number> | null;
  vitals_enabled?: Record<string, boolean> | null;
}

// ── Enum maps ─────────────────────────────────────────────────────────────────

const STRESS_MAP: Record<number, string>  = { 0:'Unknown',1:'Very Low',2:'Low',3:'Normal',4:'High',5:'Extreme' };
const ZONE_MAP:   Record<number, string>  = { 0:'Unknown',1:'Low',2:'Normal',3:'High' };
const RISK_MAP:   Record<number, string>  = { 0:'Unknown',1:'Low',2:'Medium',3:'High' };
const WELLNESS_MAP: Record<number, string>= { 0:'Unknown',1:'Low',2:'Normal',3:'High' };

// ── Status helpers ────────────────────────────────────────────────────────────

type StatusTier = 'good' | 'watch' | 'bad' | 'neutral';

function tier(t: StatusTier): { color: string; bg: string; border: string } {
  if (t === 'good')    return { color:'#0f766e', bg:'#f0fdfa', border:'#99f6e4' };
  if (t === 'watch')   return { color:'#b45309', bg:'#fffbeb', border:'#fde68a' };
  if (t === 'bad')     return { color:'#dc2626', bg:'#fef2f2', border:'#fecaca' };
  return                      { color:'#64748b', bg:'#f1f5f9', border:'#e2e8f0' };
}

function riskTier(v?: number | null) {
  if (v == null) return { label:'—', ...tier('neutral') };
  const label = RISK_MAP[v] ?? '—';
  if (v <= 1) return { label, ...tier('good') };
  if (v === 2) return { label, ...tier('watch') };
  return { label, ...tier('bad') };
}
function zoneTier(v?: number | null) {
  const label = v != null ? (ZONE_MAP[v] ?? '—') : '—';
  if (v === 2) return { label, ...tier('good') };
  if (v === 1 || v === 3) return { label, ...tier('watch') };
  return { label, ...tier('neutral') };
}

// ── Indicator definitions ─────────────────────────────────────────────────────

export interface IndicatorDef {
  id: string;
  category: string;
  catColor: string;
  label: string;
  getValue(s: ScanResult): string;
  getStatus(s: ScanResult): { label: string; color: string; bg: string; border: string };
  target: string;
  whatItMeans: string;
  whenToAct: string;
  link: string;
}

export const INDICATORS: IndicatorDef[] = [
  // ── Cardiovascular ──────────────────────────────────────────────────────────
  {
    id:'pulse', category:'Cardiovascular', catColor:'#0f766e',
    label:'Pulse Rate',
    getValue: s => s.pulse_rate != null ? `${Math.round(s.pulse_rate)} bpm` : '—',
    getStatus: s => {
      const v = s.pulse_rate;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v >= 60 && v <= 100) return { label:'Optimal', ...tier('good') };
      if (v < 60)  return { label:'Low',     ...tier('watch') };
      return              { label:'Elevated', ...tier('watch') };
    },
    target:'60 – 100 bpm',
    whatItMeans:'Your resting heart rate shows how efficiently your heart pumps blood. A healthy adult range is 60–100 bpm. Athletes may naturally be lower (40–60 bpm).',
    whenToAct:'Consistently above 100 bpm (tachycardia) or below 60 bpm without athletic training should be reviewed by a doctor.',
    link:'https://mywellfie.com/hr-info',
  },
  {
    id:'bp', category:'Cardiovascular', catColor:'#0f766e',
    label:'Blood Pressure',
    getValue: s => (s.blood_pressure_systolic != null && s.blood_pressure_diastolic != null)
      ? `${Math.round(s.blood_pressure_systolic)} / ${Math.round(s.blood_pressure_diastolic)} mmHg` : '—',
    getStatus: s => {
      const v = s.blood_pressure_systolic;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v < 120) return { label:'Healthy',  ...tier('good') };
      if (v < 130) return { label:'Elevated', ...tier('watch') };
      return              { label:'High',     ...tier('bad') };
    },
    target:'< 120 / 80 mmHg',
    whatItMeans:'Blood pressure reflects the force blood exerts on artery walls. Systolic (top) is the peak pressure during heartbeats; diastolic (bottom) is between beats. Unmanaged high BP silently damages arteries and organs.',
    whenToAct:'Above 130/80 on multiple readings = Stage 1 hypertension. Above 140/90 = Stage 2 — consult a physician.',
    link:'https://mywellfie.com/bp-info',
  },
  {
    id:'pulse_pressure', category:'Cardiovascular', catColor:'#0f766e',
    label:'Pulse Pressure',
    getValue: s => s.pulse_pressure != null ? `${Math.round(s.pulse_pressure)} mmHg` : '—',
    getStatus: s => {
      const v = s.pulse_pressure;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v >= 25 && v <= 50) return { label:'Normal',   ...tier('good') };
      if (v > 50)             return { label:'Elevated', ...tier('watch') };
      return                         { label:'Low',      ...tier('watch') };
    },
    target:'25 – 50 mmHg',
    whatItMeans:'Pulse pressure is the difference between systolic and diastolic readings. It reflects how forcefully the heart contracts. Values above 60 mmHg suggest arterial stiffness, a predictor of cardiovascular risk.',
    whenToAct:'Persistently above 60 mmHg, especially in adults over 50, warrants cardiovascular evaluation.',
    link:'https://mywellfie.com/pulse-pressure',
  },
  {
    id:'map', category:'Cardiovascular', catColor:'#0f766e',
    label:'Mean Arterial Pressure',
    getValue: s => s.mean_arterial_pressure != null ? `${Math.round(s.mean_arterial_pressure)} mmHg` : '—',
    getStatus: s => {
      const v = s.mean_arterial_pressure;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v >= 70 && v <= 100) return { label:'Normal', ...tier('good') };
      return { label: v > 100 ? 'High' : 'Low', ...tier(v > 100 ? 'bad' : 'watch') };
    },
    target:'70 – 100 mmHg',
    whatItMeans:'MAP is the true average pressure your vital organs experience throughout the entire cardiac cycle. It is the pressure that drives oxygen to organs like the kidneys and brain.',
    whenToAct:'MAP below 65 mmHg is a medical emergency (shock). Above 100 mmHg consistently increases vascular strain — speak to your doctor.',
    link:'https://mywellfie.com/map-info',
  },
  {
    id:'cardiac_workload', category:'Cardiovascular', catColor:'#0f766e',
    label:'Cardiac Workload',
    getValue: s => s.cardiac_workload != null ? s.cardiac_workload.toFixed(1) : '—',
    getStatus: s => {
      const v = s.cardiac_workload;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v >= 3.9 && v <= 4.2) return { label:'Normal',   ...tier('good') };
      return                           { label:'Elevated', ...tier('watch') };
    },
    target:'3.9 – 4.2',
    whatItMeans:'Cardiac workload approximates myocardial oxygen demand — essentially how hard your heart muscle is working. A Rate-Pressure Product proxy that indicates cardiovascular strain.',
    whenToAct:'Elevated cardiac workload at rest, combined with high BP or stress, warrants a clinical review.',
    link:'https://mywellfie.com/workload-info',
  },
  {
    id:'heart_age', category:'Cardiovascular', catColor:'#0f766e',
    label:'Heart Age',
    getValue: s => s.heart_age != null ? `${Math.round(s.heart_age)} yrs` : '—',
    getStatus: s => ({ label: s.heart_age != null ? 'Estimated' : '—', ...tier('neutral') }),
    target:'Match your age',
    whatItMeans:'Heart Age uses the Framingham model to estimate the biological age of your cardiovascular system compared to an ideal healthy profile for your demographic. A higher heart age = higher cardiovascular risk.',
    whenToAct:'If your heart age is more than 5 years older than your actual age, focus on BP, cholesterol, activity, and diet. Consult a GP.',
    link:'https://mywellfie.com/heartage-info',
  },
  // ── Respiratory ─────────────────────────────────────────────────────────────
  {
    id:'resp_rate', category:'Respiratory', catColor:'#0ea5e9',
    label:'Breathing Rate',
    getValue: s => s.respiration_rate != null ? `${Math.round(s.respiration_rate)} brpm` : '—',
    getStatus: s => {
      const v = s.respiration_rate;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v >= 12 && v <= 20) return { label:'Normal',   ...tier('good') };
      return { label: v < 12 ? 'Low' : 'Elevated', ...tier('watch') };
    },
    target:'12 – 20 brpm',
    whatItMeans:'Breathing rate is the number of full respiratory cycles per minute at rest. An elevated rate can indicate anxiety, fever, infection, heart failure, or pain. A low rate may signal deep relaxation or sedation.',
    whenToAct:'Above 25 brpm or below 10 brpm at rest consistently — seek medical advice.',
    link:'https://mywellfie.com/respiration-info',
  },
  {
    id:'spo2', category:'Respiratory', catColor:'#0ea5e9',
    label:'Oxygen Saturation (SpO₂)',
    getValue: s => s.oxygen_saturation != null ? `${s.oxygen_saturation.toFixed(1)} %` : '—',
    getStatus: s => {
      const v = s.oxygen_saturation;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v >= 98) return { label:'Perfect', ...tier('good') };
      if (v >= 95) return { label:'Good',    ...tier('good') };
      return              { label:'Low',     ...tier('bad') };
    },
    target:'> 95%',
    whatItMeans:'SpO₂ measures the percentage of haemoglobin saturated with oxygen. Even a 1–2% drop below 95% can impair cognitive function, organ performance, and energy levels.',
    whenToAct:'Below 95% needs attention. Below 90% is a medical emergency — call emergency services immediately.',
    link:'https://mywellfie.com/spo2-info',
  },
  // ── HRV / Autonomic ─────────────────────────────────────────────────────────
  {
    id:'sdnn', category:'HRV / Autonomic', catColor:'#7c3aed',
    label:'SDNN',
    getValue: s => s.sdnn != null ? `${s.sdnn.toFixed(1)} ms` : '—',
    getStatus: s => {
      const v = s.sdnn;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v >= 50) return { label:'Good',     ...tier('good') };
      if (v >= 30) return { label:'Low',      ...tier('watch') };
      return              { label:'Very Low', ...tier('bad') };
    },
    target:'≥ 50 ms',
    whatItMeans:'SDNN is the gold-standard measure of overall heart rate variability. A higher SDNN means your ANS is flexible and resilient. Low SDNN is strongly linked to cardiovascular risk, burnout, and poor recovery capacity.',
    whenToAct:'Below 30 ms is considered high cardiac risk. Chronic low SDNN — review sleep quality, chronic stress, and physical activity with your doctor.',
    link:'https://mywellfie.com/sdnn-info',
  },
  {
    id:'rmssd', category:'HRV / Autonomic', catColor:'#7c3aed',
    label:'RMSSD',
    getValue: s => s.rmssd != null ? `${s.rmssd.toFixed(1)} ms` : '—',
    getStatus: s => {
      const v = s.rmssd;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v >= 20) return { label:'Good', ...tier('good') };
      return              { label:'Low',  ...tier('watch') };
    },
    target:'20 – 43 ms',
    whatItMeans:'RMSSD reflects immediate parasympathetic (vagal) tone — your body\'s ability to calm down quickly. It\'s the HRV metric most sensitive to acute stress, poor sleep, and over-training.',
    whenToAct:'A sudden drop of ≥20% from your personal baseline often precedes illness or burnout. Track trends over time.',
    link:'https://mywellfie.com/rmssd-info',
  },
  {
    id:'mean_rri', category:'HRV / Autonomic', catColor:'#7c3aed',
    label:'Mean RRI',
    getValue: s => s.mean_rri != null ? `${Math.round(s.mean_rri)} ms` : '—',
    getStatus: s => {
      const v = s.mean_rri;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v >= 700 && v <= 1000) return { label:'Normal', ...tier('good') };
      return { label: v > 1000 ? 'Elevated' : 'Low', ...tier('watch') };
    },
    target:'700 – 1000 ms',
    whatItMeans:'Mean RRI is the average time between consecutive heartbeats. Longer intervals (lower heart rate) generally indicate stronger parasympathetic tone and better cardiovascular fitness.',
    whenToAct:'Very short RRI (<600 ms at rest) paired with other abnormal metrics — discuss with your cardiologist.',
    link:'https://mywellfie.com/rri-info',
  },
  {
    id:'lfhf', category:'HRV / Autonomic', catColor:'#7c3aed',
    label:'LF/HF Ratio',
    getValue: s => s.lfhf != null ? s.lfhf.toFixed(2) : '—',
    getStatus: s => {
      const v = s.lfhf;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v >= 0.5 && v <= 2) return { label:'Balanced',      ...tier('good') };
      return { label: v > 2 ? 'Sympathetic ↑' : 'Parasympathetic ↑', ...tier('watch') };
    },
    target:'0.5 – 2.0',
    whatItMeans:'The LF/HF ratio quantifies sympatho-vagal balance from HRV frequency analysis. A high ratio signals sympathetic (stress) dominance; low ratio signals parasympathetic dominance. Both extremes at rest are worth monitoring.',
    whenToAct:'Consistently above 3.0 at rest suggests chronic stress or autonomic imbalance — sleep, breath work, and lifestyle review advised.',
    link:'https://mywellfie.com/lfhf-info',
  },
  {
    id:'prq', category:'HRV / Autonomic', catColor:'#7c3aed',
    label:'PRQ',
    getValue: s => s.prq != null ? s.prq.toFixed(1) : '—',
    getStatus: s => {
      const v = s.prq;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v >= 4 && v <= 6) return { label:'Normal', ...tier('good') };
      return                       { label:'Off',    ...tier('watch') };
    },
    target:'~5',
    whatItMeans:'The Pulse-Respiration Quotient measures the efficiency of coordination between the heart and lungs. A normal PRQ of ~5 means your heart beats ~5 times per breath cycle, reflecting optimal cardiopulmonary coupling.',
    whenToAct:'Significant deviations from 5 (below 3 or above 7) alongside other abnormal metrics deserve clinical attention.',
    link:'https://mywellfie.com/prq-info',
  },
  {
    id:'pns', category:'HRV / Autonomic', catColor:'#7c3aed',
    label:'PNS Zone',
    getValue: s => s.pns_zone != null
      ? `${ZONE_MAP[s.pns_zone] ?? '—'}  (${s.pns_index?.toFixed(2) ?? '—'})` : '—',
    getStatus: s => zoneTier(s.pns_zone),
    target:'Normal zone',
    whatItMeans:'The Parasympathetic Nervous System (PNS) governs rest, recovery, digestion, and immune function. High PNS activity means your body is effectively repairing and regenerating. Low PNS suggests chronic stress dominance.',
    whenToAct:'Chronically low PNS activity alongside high stress index is associated with burnout, immune suppression, and cardiovascular risk.',
    link:'https://mywellfie.com/pns-info',
  },
  {
    id:'sns', category:'HRV / Autonomic', catColor:'#7c3aed',
    label:'SNS Zone',
    getValue: s => s.sns_zone != null
      ? `${ZONE_MAP[s.sns_zone] ?? '—'}  (${s.sns_index?.toFixed(2) ?? '—'})` : '—',
    getStatus: s => zoneTier(s.sns_zone),
    target:'Normal zone',
    whatItMeans:'The Sympathetic Nervous System (SNS) activates fight-or-flight responses during stress or exercise. Elevated SNS at rest means your body is stuck in a chronic stress state — common with anxiety, poor sleep, or high caffeine.',
    whenToAct:'High SNS + high stress index + low HRV together are a strong signal to reduce stressors and seek professional support.',
    link:'https://mywellfie.com/sns-info',
  },
  // ── Stress & Wellness ───────────────────────────────────────────────────────
  {
    id:'stress_level', category:'Stress & Wellness', catColor:'#d97706',
    label:'Stress Level',
    getValue: s => s.stress_level != null ? (STRESS_MAP[s.stress_level] ?? '—') : '—',
    getStatus: s => {
      const v = s.stress_level;
      if (v == null) return { label:'—', ...tier('neutral') };
      const label = STRESS_MAP[v] ?? '—';
      if (v <= 2) return { label, ...tier('good') };
      if (v <= 3) return { label, ...tier('watch') };
      return              { label, ...tier('bad') };
    },
    target:'Low / Normal',
    whatItMeans:'Stress Level is derived from the Baevsky Stress Index — a mathematical model of how hard the ANS works to maintain homeostasis. Elevated stress depletes immune, metabolic, and cognitive reserves over time.',
    whenToAct:'High (4) or Extreme (5) on consecutive scans: prioritise sleep hygiene, diaphragmatic breathing, and reducing stimulant intake. Speak to a doctor if persistent.',
    link:'https://mywellfie.com/stress-labs',
  },
  {
    id:'stress_index', category:'Stress & Wellness', catColor:'#d97706',
    label:'Stress Index (Raw)',
    getValue: s => s.stress_index != null ? Math.round(s.stress_index).toString() : '—',
    getStatus: s => {
      const v = s.stress_index;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v < 150)  return { label:'Normal',   ...tier('good') };
      if (v < 300)  return { label:'Elevated', ...tier('watch') };
      return               { label:'High',     ...tier('bad') };
    },
    target:'< 150',
    whatItMeans:'The raw Baevsky Stress Index is a non-negative mathematical measure of sympathetic nervous system dominance over parasympathetic activity. Higher values indicate the body is under significant regulatory load.',
    whenToAct:'Above 300 consistently — significant autonomic burden. Lifestyle and clinical review recommended.',
    link:'https://mywellfie.com/stress-index',
  },
  {
    id:'normalized_stress_index', category:'Stress & Wellness', catColor:'#d97706',
    label:'Normalized Stress Index',
    getValue: s => s.normalized_stress_index != null ? `${Math.round(s.normalized_stress_index)}%` : '—',
    getStatus: s => {
      const v = s.normalized_stress_index;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v < 40)  return { label:'Normal',   ...tier('good') };
      if (v < 60)  return { label:'Elevated', ...tier('watch') };
      return               { label:'High',     ...tier('bad') };
    },
    target:'< 40%',
    whatItMeans:'The SDK-normalized stress index (0–100) scales the Baevsky Stress Index for cross-session comparison. Lower values indicate lower autonomic stress load — use this metric for trends rather than the raw index.',
    whenToAct:'Consistently above 60% suggests sustained autonomic strain — prioritise recovery, sleep, and stress management.',
    link:'https://mywellfie.com/stress-normalized',
  },
  {
    id:'wellness', category:'Stress & Wellness', catColor:'#d97706',
    label:'Wellness Score',
    getValue: s => formatWellnessIndexDisplay(s.wellness_index),
    getStatus: s => {
      const v = getWellnessIndexRaw(s.wellness_index);
      if (v == null) return { label:'—', ...tier('neutral') };
      const tierKey = getWellnessStatusTierFromLevel(s.wellness_level);
      if (tierKey === 'good') return { label: wellnessLevelLabel(s.wellness_level), ...tier('good') };
      if (tierKey === 'watch') return { label: wellnessLevelLabel(s.wellness_level), ...tier('watch') };
      return { label: wellnessLevelLabel(s.wellness_level), ...tier('bad') };
    },
    target:'Per SDK wellness index & level',
    whatItMeans:'The Wellness Score (Binah model) is a composite index predicting cardiovascular risk over 5–10 years. My Wellfie displays the SDK wellness index as returned, alongside the wellness level classification (Low / Normal / High).',
    whenToAct:'Consistently below 40 indicates significant cardiovascular or metabolic risk factors — full clinical evaluation recommended.',
    link:'https://mywellfie.com/wellness-info',
  },
  {
    id:'wellness_level', category:'Stress & Wellness', catColor:'#d97706',
    label:'Wellness Level',
    getValue: s => s.wellness_level != null ? (WELLNESS_MAP[s.wellness_level] ?? '—') : '—',
    getStatus: s => {
      const v = s.wellness_level;
      if (v == null) return { label:'—', ...tier('neutral') };
      const label = WELLNESS_MAP[v] ?? '—';
      if (v >= 2) return { label, ...tier('good') };
      if (v === 1) return { label, ...tier('watch') };
      return { label, ...tier('bad') };
    },
    target:'Normal / High',
    whatItMeans:'Wellness Level is the SDK enum classification paired with the wellness index — Unknown, Low, Normal, or High. It reflects overall cardiovascular wellness without custom scaling.',
    whenToAct:'Consistently Low on multiple scans warrants lifestyle review and clinical follow-up.',
    link:'https://mywellfie.com/wellness-info',
  },
  // ── Metabolic ───────────────────────────────────────────────────────────────
  {
    id:'hba1c', category:'Metabolic', catColor:'#dc2626',
    label:'HbA1c',
    getValue: s => s.hemoglobin_a1c != null ? `${s.hemoglobin_a1c.toFixed(1)} %` : '—',
    getStatus: s => {
      const v = s.hemoglobin_a1c;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v < 5.7)  return { label:'Normal',        ...tier('good') };
      if (v < 6.5)  return { label:'Pre-diabetic',  ...tier('watch') };
      return               { label:'Diabetic range', ...tier('bad') };
    },
    target:'< 5.7%',
    whatItMeans:'HbA1c reflects your average blood sugar over the past 2–3 months. It is the primary diagnostic marker for Type 2 diabetes and pre-diabetes. Chronically elevated blood sugar damages nerves, kidneys, eyes, and blood vessels.',
    whenToAct:'5.7–6.4% = pre-diabetes: dietary and lifestyle changes now. ≥6.5% = diabetes threshold — consult an endocrinologist immediately.',
    link:'https://mywellfie.com/hba1c-biomarker',
  },
  {
    id:'hemoglobin', category:'Metabolic', catColor:'#dc2626',
    label:'Haemoglobin',
    getValue: s => s.hemoglobin != null ? `${s.hemoglobin.toFixed(1)} g/dL` : '—',
    getStatus: s => {
      const v = s.hemoglobin;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v >= 12)  return { label:'Normal', ...tier('good') };
      return               { label:'Low',    ...tier('bad') };
    },
    target:'M: 14–18 / F: 12–16 g/dL',
    whatItMeans:'Haemoglobin carries oxygen from your lungs to every cell in your body. Low haemoglobin is the defining feature of anaemia — causing fatigue, breathlessness, pale skin, and reduced physical and cognitive performance.',
    whenToAct:'Below 12 g/dL (women) or 13.5 g/dL (men) — request a full blood count. Iron, B12, or folate deficiency may be the cause.',
    link:'https://mywellfie.com/hemoglobin-biomarker',
  },
  // ── Risk Scores ─────────────────────────────────────────────────────────────
  {
    id:'ascvd', category:'Risk Scores', catColor:'#334155',
    label:'ASCVD 10-Year Risk',
    getValue: s => s.ascvd_risk != null
      ? `${s.ascvd_risk.toFixed(1)}% · ${RISK_MAP[s.ascvd_risk_level ?? 0] ?? '—'}`
      : (s.ascvd_risk_level != null ? RISK_MAP[s.ascvd_risk_level] : '—'),
    getStatus: s => riskTier(s.ascvd_risk_level),
    target:'< 10%  (Low)',
    whatItMeans:'The ASCVD score estimates the probability of a heart attack or stroke within 10 years using the Framingham Cardiovascular Disease model. It is one of the most clinically validated cardiovascular risk tools.',
    whenToAct:'10–20% = borderline high. >20% = high risk — full lipid panel and cardiology consultation strongly advised.',
    link:'https://mywellfie.com/ascvd-info',
  },
  {
    id:'bp_risk', category:'Risk Scores', catColor:'#334155',
    label:'High BP Risk',
    getValue: s => s.high_blood_pressure_risk != null ? RISK_MAP[s.high_blood_pressure_risk] : '—',
    getStatus: s => riskTier(s.high_blood_pressure_risk),
    target:'Low',
    whatItMeans:'This risk score combines multiple scan signals to estimate the probability that your blood pressure is chronically elevated beyond normal limits — even when a single reading looks borderline.',
    whenToAct:'Medium or High risk on multiple scans — track BP daily for 2 weeks and consult your GP if elevated.',
    link:'https://mywellfie.com/hbp-info',
  },
  {
    id:'glucose_risk', category:'Risk Scores', catColor:'#334155',
    label:'High Fasting Glucose Risk',
    getValue: s => s.high_fasting_glucose_risk != null ? RISK_MAP[s.high_fasting_glucose_risk] : '—',
    getStatus: s => riskTier(s.high_fasting_glucose_risk),
    target:'Low',
    whatItMeans:'This risk score flags whether your metabolic markers suggest elevated blood sugar after fasting ≥8 hours. Only meaningful if you were fasting before the scan. It is an early pre-diabetes signal.',
    whenToAct:'Medium or High risk — confirm with a lab fasting plasma glucose test. Diet and exercise can reverse early impaired fasting glucose.',
    link:'https://mywellfie.com/glucose-info',
  },
  {
    id:'cholesterol_risk', category:'Risk Scores', catColor:'#334155',
    label:'High Cholesterol Risk',
    getValue: s => s.high_total_cholesterol_risk != null ? RISK_MAP[s.high_total_cholesterol_risk] : '—',
    getStatus: s => riskTier(s.high_total_cholesterol_risk),
    target:'Low',
    whatItMeans:'This risk score uses facial hemodynamic signals as a proxy to estimate whether total cholesterol may exceed 200 mg/dL. High cholesterol builds arterial plaque, increasing heart attack and stroke risk.',
    whenToAct:'Medium or High risk — confirm with a lipid panel. Discuss dietary changes, exercise, and potential statin therapy with your doctor.',
    link:'https://mywellfie.com/cholesterol-info',
  },
];

export const INDICATOR_CATEGORIES = [
  { label:'Cardiovascular',   color:'#0f766e' },
  { label:'Respiratory',      color:'#0ea5e9' },
  { label:'HRV / Autonomic',  color:'#7c3aed' },
  { label:'Stress & Wellness',color:'#d97706' },
  { label:'Metabolic',        color:'#dc2626' },
  { label:'Risk Scores',      color:'#334155' },
] as const;

export const PRIMARY_INDICATOR_IDS = ['pulse', 'bp', 'spo2', 'stress_level'] as const;
export const WELLNESS_INDICATOR_ID = 'wellness';
export const MISSING_VALUE = '—';

export function getIndicatorById(id: string): IndicatorDef | undefined {
  return INDICATORS.find((ind) => ind.id === id);
}

export function getIndicatorIndex(id: string): number {
  return INDICATORS.findIndex((ind) => ind.id === id);
}

export function getIndicatorsGroupedByCategory(): { category: string; color: string; items: IndicatorDef[] }[] {
  return INDICATOR_CATEGORIES.map(({ label, color }) => ({
    category: label,
    color,
    items: INDICATORS.filter((ind) => ind.category === label),
  }));
}
