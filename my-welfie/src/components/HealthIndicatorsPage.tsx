// HealthIndicatorsCarousel.tsx
// Scrollable card row showing all 20 health indicators from the latest scan.
// Click any card → full detail modal with explanation + when to act.

import React, { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface IndicatorDef {
  id: string;
  category: string;
  catColor: string;
  icon: string;
  label: string;
  getValue(s: ScanResult): string;
  getStatus(s: ScanResult): { label: string; color: string; bg: string; border: string };
  target: string;
  whatItMeans: string;
  whenToAct: string;
  link: string;
}

const INDICATORS: IndicatorDef[] = [
  // ── Cardiovascular ──────────────────────────────────────────────────────────
  {
    id:'pulse', category:'Cardiovascular', catColor:'#0f766e', icon:'❤️',
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
    id:'bp', category:'Cardiovascular', catColor:'#0f766e', icon:'🩺',
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
    id:'pulse_pressure', category:'Cardiovascular', catColor:'#0f766e', icon:'📊',
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
    id:'map', category:'Cardiovascular', catColor:'#0f766e', icon:'🔄',
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
    id:'cardiac_workload', category:'Cardiovascular', catColor:'#0f766e', icon:'⚙️',
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
    id:'heart_age', category:'Cardiovascular', catColor:'#0f766e', icon:'🫀',
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
    id:'resp_rate', category:'Respiratory', catColor:'#0ea5e9', icon:'🫁',
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
    id:'spo2', category:'Respiratory', catColor:'#0ea5e9', icon:'🩸',
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
    id:'sdnn', category:'HRV / Autonomic', catColor:'#7c3aed', icon:'📈',
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
    id:'rmssd', category:'HRV / Autonomic', catColor:'#7c3aed', icon:'〰️',
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
    id:'mean_rri', category:'HRV / Autonomic', catColor:'#7c3aed', icon:'🔃',
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
    id:'lfhf', category:'HRV / Autonomic', catColor:'#7c3aed', icon:'⚖️',
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
    id:'prq', category:'HRV / Autonomic', catColor:'#7c3aed', icon:'🤝',
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
    id:'pns', category:'HRV / Autonomic', catColor:'#7c3aed', icon:'😌',
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
    id:'sns', category:'HRV / Autonomic', catColor:'#7c3aed', icon:'⚡',
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
    id:'stress_level', category:'Stress & Wellness', catColor:'#d97706', icon:'🧠',
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
    id:'stress_index', category:'Stress & Wellness', catColor:'#d97706', icon:'📉',
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
    id:'wellness', category:'Stress & Wellness', catColor:'#d97706', icon:'🌿',
    label:'Wellness Score',
    getValue: s => s.wellness_index != null ? `${s.wellness_index.toFixed(1)} / 100` : '—',
    getStatus: s => {
      const v = s.wellness_index;
      if (v == null) return { label:'—', ...tier('neutral') };
      if (v >= 70)  return { label:'Good',     ...tier('good') };
      if (v >= 40)  return { label:'Moderate', ...tier('watch') };
      return               { label:'Low',      ...tier('bad') };
    },
    target:'> 70',
    whatItMeans:'The Wellness Score (Binah model) is a composite index predicting cardiovascular risk over 5–10 years. It integrates HRV, BP, stress, and respiratory data into a single actionable number on a 0–100 scale.',
    whenToAct:'Consistently below 40 indicates significant cardiovascular or metabolic risk factors — full clinical evaluation recommended.',
    link:'https://mywellfie.com/wellness-info',
  },
  // ── Metabolic ───────────────────────────────────────────────────────────────
  {
    id:'hba1c', category:'Metabolic', catColor:'#dc2626', icon:'🧪',
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
    id:'hemoglobin', category:'Metabolic', catColor:'#dc2626', icon:'💉',
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
    id:'ascvd', category:'Risk Scores', catColor:'#334155', icon:'🫀',
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
    id:'bp_risk', category:'Risk Scores', catColor:'#334155', icon:'⚠️',
    label:'High BP Risk',
    getValue: s => s.high_blood_pressure_risk != null ? RISK_MAP[s.high_blood_pressure_risk] : '—',
    getStatus: s => riskTier(s.high_blood_pressure_risk),
    target:'Low',
    whatItMeans:'This risk score combines multiple scan signals to estimate the probability that your blood pressure is chronically elevated beyond normal limits — even when a single reading looks borderline.',
    whenToAct:'Medium or High risk on multiple scans — track BP daily for 2 weeks and consult your GP if elevated.',
    link:'https://mywellfie.com/hbp-info',
  },
  {
    id:'glucose_risk', category:'Risk Scores', catColor:'#334155', icon:'🍬',
    label:'High Fasting Glucose Risk',
    getValue: s => s.high_fasting_glucose_risk != null ? RISK_MAP[s.high_fasting_glucose_risk] : '—',
    getStatus: s => riskTier(s.high_fasting_glucose_risk),
    target:'Low',
    whatItMeans:'This risk score flags whether your metabolic markers suggest elevated blood sugar after fasting ≥8 hours. Only meaningful if you were fasting before the scan. It is an early pre-diabetes signal.',
    whenToAct:'Medium or High risk — confirm with a lab fasting plasma glucose test. Diet and exercise can reverse early impaired fasting glucose.',
    link:'https://mywellfie.com/glucose-info',
  },
  {
    id:'cholesterol_risk', category:'Risk Scores', catColor:'#334155', icon:'🔬',
    label:'High Cholesterol Risk',
    getValue: s => s.high_total_cholesterol_risk != null ? RISK_MAP[s.high_total_cholesterol_risk] : '—',
    getStatus: s => riskTier(s.high_total_cholesterol_risk),
    target:'Low',
    whatItMeans:'This risk score uses facial hemodynamic signals as a proxy to estimate whether total cholesterol may exceed 200 mg/dL. High cholesterol builds arterial plaque, increasing heart attack and stroke risk.',
    whenToAct:'Medium or High risk — confirm with a lipid panel. Discuss dietary changes, exercise, and potential statin therapy with your doctor.',
    link:'https://mywellfie.com/cholesterol-info',
  },
];

// ── Icons ─────────────────────────────────────────────────────────────────────

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ── Detail Modal ──────────────────────────────────────────────────────────────

const IndicatorModal: React.FC<{
  indicator: IndicatorDef;
  scan: ScanResult;
  idx: number;
  total: number;
  onClose(): void;
  onPrev(): void;
  onNext(): void;
}> = ({ indicator, scan, idx, total, onClose, onPrev, onNext }) => {
  const value  = indicator.getValue(scan);
  const status = indicator.getStatus(scan);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:'fixed', inset:0, zIndex:1000,
        background:'rgba(15,23,42,0.6)', backdropFilter:'blur(6px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:16,
      }}
    >
      <div style={{
        background:'#fff', borderRadius:20, width:'100%', maxWidth:460,
        boxShadow:'0 32px 80px rgba(0,0,0,0.22)',
        overflow:'hidden', animation:'mwSlideUp .2s ease',
      }}>
        {/* ── Top colour band ── */}
        <div style={{
          background:`linear-gradient(135deg,${indicator.catColor}22,${indicator.catColor}0a)`,
          borderBottom:'1px solid #e2e8f0', padding:'20px 20px 16px',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{
                width:46, height:46, borderRadius:13,
                background:`${indicator.catColor}18`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:24,
              }}>
                {indicator.icon}
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:indicator.catColor, marginBottom:2 }}>
                  {indicator.category}
                </div>
                <div style={{ fontSize:18, fontWeight:800, color:'#0f172a' }}>{indicator.label}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:8, padding:'6px 7px', cursor:'pointer', color:'#64748b', display:'flex', lineHeight:1 }}>
              <CloseIcon />
            </button>
          </div>

          {/* Value + badge */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:16 }}>
            <div style={{ fontSize:34, fontWeight:900, color:'#0f172a', lineHeight:1 }}>
              {value === '—' ? <span style={{ color:'#cbd5e1' }}>—</span> : value}
            </div>
            <span style={{
              fontSize:12, fontWeight:700, borderRadius:999, padding:'4px 12px',
              background:status.bg, color:status.color, border:`1px solid ${status.border}`,
            }}>
              {status.label}
            </span>
          </div>
          <div style={{ fontSize:12, color:'#64748b', marginTop:6 }}>
            <span style={{ fontWeight:600 }}>Target: </span>{indicator.target}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding:'18px 20px 20px' }}>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'#0f172a', marginBottom:6 }}>
              What this measures
            </div>
            <p style={{ fontSize:14, color:'#334155', lineHeight:1.68, margin:0 }}>{indicator.whatItMeans}</p>
          </div>

          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#92400e', marginBottom:5 }}>⚠️ When to take action</div>
            <p style={{ fontSize:13, color:'#78350f', lineHeight:1.6, margin:0 }}>{indicator.whenToAct}</p>
          </div>

          <a href={indicator.link} target="_blank" rel="noopener noreferrer"
            style={{ display:'block', textAlign:'center', padding:'10px', background:'#f0fdfa', borderRadius:10, fontSize:13, fontWeight:600, color:'#0f766e', textDecoration:'none', border:'1px solid #99f6e4' }}>
            Learn more →
          </a>
        </div>

        {/* ── Footer nav ── */}
        <div style={{ borderTop:'1px solid #f1f5f9', padding:'10px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc' }}>
          <button onClick={onPrev} disabled={idx === 0}
            style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 12px', cursor: idx > 0 ? 'pointer':'default', opacity: idx > 0 ? 1 : 0.3, fontSize:13, fontWeight:600, color:'#374151', fontFamily:'inherit' }}>
            <ChevronLeftIcon /> Prev
          </button>
          <span style={{ fontSize:12, color:'#94a3b8' }}>{idx + 1} / {total}</span>
          <button onClick={onNext} disabled={idx === total - 1}
            style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 12px', cursor: idx < total-1 ? 'pointer':'default', opacity: idx < total-1 ? 1 : 0.3, fontSize:13, fontWeight:600, color:'#374151', fontFamily:'inherit' }}>
            Next <ChevronRightIcon />
          </button>
        </div>
      </div>

      <style>{`@keyframes mwSlideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
};

// ── Category legend ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { label:'Cardiovascular',   color:'#0f766e' },
  { label:'Respiratory',      color:'#0ea5e9' },
  { label:'HRV / Autonomic',  color:'#7c3aed' },
  { label:'Stress & Wellness',color:'#d97706' },
  { label:'Metabolic',        color:'#dc2626' },
  { label:'Risk Scores',      color:'#334155' },
];

// ── Main component ────────────────────────────────────────────────────────────

const HealthIndicatorsCarousel: React.FC<{
  scan: ScanResult;
  isMobile?: boolean;
}> = ({ scan, isMobile = false }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx]       = useState<number | null>(null);
  const [canLeft,   setCanLeft]         = useState(false);
  const [canRight,  setCanRight]        = useState(true);

  const checkEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    checkEdges();
    const el = scrollRef.current;
    el?.addEventListener('scroll', checkEdges, { passive:true });
    window.addEventListener('resize', checkEdges);
    return () => { el?.removeEventListener('scroll', checkEdges); window.removeEventListener('resize', checkEdges); };
  }, [checkEdges]);

  const scroll = (dir: 'left' | 'right') =>
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -280 : 280, behavior:'smooth' });

  const CARD_W = isMobile ? 155 : 168;

  return (
    <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 2px 16px rgba(0,0,0,0.06)', paddingTop: isMobile ? 20 : 24, paddingBottom: isMobile ? 16 : 20, marginBottom:20 }}>

      {/* Header row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding: isMobile ? '0 16px 14px' : '0 28px 16px' }}>
        <div>
          <h2 style={{ fontSize:17, fontWeight:700, color:'#0f172a', margin:0 }}>Health Indicators</h2>
          <p style={{ fontSize:13, color:'#94a3b8', margin:'3px 0 0' }}>
            {INDICATORS.length} metrics from your latest scan — tap any card for full details
          </p>
        </div>
        {/* Arrow buttons — desktop only */}
        {!isMobile && (
          <div style={{ display:'flex', gap:8 }}>
            {(['left','right'] as const).map(dir => {
              const active = dir === 'left' ? canLeft : canRight;
              return (
                <button key={dir} onClick={() => scroll(dir)} disabled={!active}
                  style={{ width:34, height:34, borderRadius:9, border:'1px solid #e2e8f0', background: active ? '#f8fafc' : '#f1f5f9', cursor: active ? 'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', color: active ? '#374151':'#cbd5e1', opacity: active ? 1 : 0.4 }}>
                  {dir === 'left' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Scroll track */}
      <div style={{ position:'relative' }}>
        {/* Fade edges */}
        {canLeft  && <div style={{ position:'absolute', left:0,  top:0, bottom:0, width:28, background:'linear-gradient(to right,#fff 60%,transparent)', zIndex:2, pointerEvents:'none' }} />}
        {canRight && <div style={{ position:'absolute', right:0, top:0, bottom:0, width:28, background:'linear-gradient(to left,#fff 60%,transparent)',  zIndex:2, pointerEvents:'none' }} />}

        <div
          ref={scrollRef}
          style={{
            display:'flex', gap:10, overflowX:'auto', scrollbarWidth:'none',
            msOverflowStyle:'none', padding: isMobile ? '4px 16px 8px' : '4px 28px 8px',
          } as React.CSSProperties}
        >
          {INDICATORS.map((ind, idx) => {
            const value  = ind.getValue(scan);
            const status = ind.getStatus(scan);
            const hasVal = value !== '—';

            return (
              <button
                key={ind.id}
                onClick={() => setActiveIdx(idx)}
                style={{
                  flexShrink:0, width:CARD_W,
                  background:'#f8fafc', border:'1.5px solid #e2e8f0',
                  borderRadius:14, padding:'13px 13px 10px',
                  cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                  transition:'box-shadow .15s, border-color .15s, transform .15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.boxShadow = '0 6px 24px rgba(15,118,110,0.14)';
                  el.style.borderColor = '#99f6e4';
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.boxShadow = 'none';
                  el.style.borderColor = '#e2e8f0';
                  el.style.transform = 'translateY(0)';
                }}
              >
                {/* Category tag + emoji */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:ind.catColor, background:`${ind.catColor}14`, padding:'2px 7px', borderRadius:6, maxWidth:'65%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {ind.category}
                  </span>
                  <span style={{ fontSize:16 }}>{ind.icon}</span>
                </div>

                {/* Label */}
                <div style={{ fontSize:11, fontWeight:600, color:'#64748b', marginBottom:6, lineHeight:1.3, minHeight:28 }}>
                  {ind.label}
                </div>

                {/* Value */}
                <div style={{ fontSize:17, fontWeight:900, color: hasVal ? '#0f172a' : '#cbd5e1', lineHeight:1, marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {value}
                </div>

                {/* Status badge */}
                <span style={{ display:'inline-block', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background:status.bg, color:status.color, border:`1px solid ${status.border}` }}>
                  {status.label}
                </span>

                {/* Tap hint */}
                <div style={{ fontSize:9, color:'#94a3b8', marginTop:7 }}>Tap for details →</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category legend */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 14px', padding: isMobile ? '10px 16px 0' : '10px 28px 0' }}>
        {CATEGORIES.map(({ label, color }) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }} />
            <span style={{ fontSize:11, color:'#64748b' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Modal */}
      {activeIdx !== null && (
        <IndicatorModal
          indicator={INDICATORS[activeIdx]}
          scan={scan}
          idx={activeIdx}
          total={INDICATORS.length}
          onClose={() => setActiveIdx(null)}
          onPrev={() => setActiveIdx(i => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setActiveIdx(i => Math.min(INDICATORS.length - 1, (i ?? 0) + 1))}
        />
      )}
    </div>
  );
};

export default HealthIndicatorsCarousel;