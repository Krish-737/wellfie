import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../api/apiFetch';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MetricDiff {
  key: string; label: string; unit: string;
  previous: number | null; current: number | null;
  delta: number | null; delta_pct: number | null;
  trend: 'improved' | 'declined' | 'stable' | 'n/a';
  higher_is_better: boolean | null;
  is_concerning: boolean;
  is_meaningful_change: boolean;
}
interface EnumDiff {
  key: string; label: string;
  previous_value: number | null; previous_label: string;
  current_value: number | null; current_label: string;
  changed: boolean;
}
interface HealthDiff {
  previous_scan_id: string; current_scan_id: string;
  previous_scanned_at: string; current_scanned_at: string;
  metrics: MetricDiff[]; enums: EnumDiff[];
  summary: string; summary_source: string;
}

// ── Groq doctor advice ────────────────────────────────────────────────────────

const GROQ_KEY = (window as any).__GROQ_KEY__ || process.env.GROQ_API_KEY || '';
const TOPICS = ['summary', 'diet', 'exercise', 'avoid', 'lifestyle', 'followup'] as const;
type Topic = typeof TOPICS[number];

async function fetchGroqAdvice(diff: HealthDiff): Promise<any> {
  const metricLines = diff.metrics.map(m => {
    const deltaStr = m.is_meaningful_change && m.delta !== null
      ? ` | change: ${m.delta > 0 ? '+' : ''}${m.delta} ${m.unit}`
      : ' | change: negligible';
    const rangeStr = m.is_concerning ? ' | OUTSIDE NORMAL RANGE' : ' | within normal range';
    return `${m.label}: ${m.previous ?? 'N/A'} → ${m.current ?? 'N/A'} ${m.unit}${deltaStr}${rangeStr}`;
  }).join('\n');

  const enumLines = diff.enums.filter(e => e.changed)
    .map(e => `${e.label}: ${e.previous_label} → ${e.current_label}`).join('\n');

  const concerning = diff.metrics.filter(m => m.is_concerning)
    .map(m => `${m.label} (${m.current}${m.unit})`).join(', ');
  const meaningful = diff.metrics.filter(m => m.is_meaningful_change)
    .map(m => `${m.label} ${(m.delta ?? 0) > 0 ? '+' : ''}${m.delta}${m.unit}`).join(', ');

  const prompt = `You are Dr. Welfie, a warm cardiologist speaking directly to your patient.

SCAN DATA:
${metricLines}

STATUS CHANGES:
${enumLines || 'None'}

KEY FACTS:
- Outside normal range: ${concerning || 'None'}
- Meaningful changes: ${meaningful || 'None'}

RULES:
1. Only raise concern for values OUTSIDE normal range or clinically meaningful deltas. Do NOT alarm over tiny normal fluctuations.
2. Diet: name the EXACT food + the specific physiological reason it helps THIS patient's readings.
3. Exercise: specify type, duration, frequency + why it helps their specific numbers.
4. Avoid: name exact substance/habit + explain the biological mechanism worsening their readings.
5. Lifestyle: specific actionable habit + biological reason linked to their data.
6. Speak warmly, directly to the patient.

Respond ONLY with JSON, no markdown:
{"overall_assessment":"2-3 warm clinical sentences","risk_level":"low","concern_flags":["metric: reason"],"diet":[{"food":"name","reason":"specific physiological reason tied to their readings","frequency":"how often"}],"exercise":[{"activity":"name","duration":"time","frequency":"how often","reason":"why for their readings"}],"avoid":[{"item":"name","reason":"exact mechanism worsening their readings"}],"lifestyle":[{"habit":"specific action","reason":"biological reason from their data"}],"followup":"specific follow-up plan","positive_note":"genuine encouraging observation"}
risk_level must be exactly: low moderate high`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1200,
      temperature: 0.6,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '';
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

function fallbackAdvice(diff: HealthDiff): any {
  const mm = Object.fromEntries(diff.metrics.map(m => [m.key, m]));
  const pulse    = mm['pulse_rate']?.current ?? null;
  const sdnn     = mm['sdnn']?.current ?? null;
  const stress   = mm['stress_index']?.current ?? null;
  const wellness = mm['wellness_index']?.current ?? null;
  const bp       = mm['blood_pressure_systolic']?.current ?? null;
  const stressHigh = stress !== null && stress > 4;
  const pulseHigh  = pulse  !== null && pulse  > 100;
  const sdnnLow    = sdnn   !== null && sdnn   < 50;
  const bpHigh     = bp     !== null && bp     > 129;
  const concernCount = diff.metrics.filter(m => m.is_concerning).length;
  const risk_level = concernCount >= 3 ? 'high' : concernCount >= 1 ? 'moderate' : 'low';

  return {
    overall_assessment: concernCount === 0
      ? 'Your readings are stable — all values are within normal clinical ranges. The small changes I see are the kind of natural daily variation everyone experiences.'
      : `${concernCount} metric${concernCount > 1 ? 's are' : ' is'} outside the normal range. ${stressHigh ? `Your stress index of ${stress} is elevated and is likely driving changes across multiple readings.` : 'Please follow the recommendations below to bring these back into range.'}`,
    risk_level,
    concern_flags: diff.metrics.filter(m => m.is_concerning)
      .map(m => `${m.label}: ${m.current}${m.unit} is outside the normal range`),
    diet: [
      pulseHigh
        ? { food: 'Magnesium-rich foods (pumpkin seeds, almonds, dark leafy greens)', reason: `Your pulse rate of ${pulse} bpm is elevated. Magnesium regulates your heart's electrical conduction system, reducing resting heart rate by 5–10 bpm over 4–6 weeks of consistent intake.`, frequency: 'Daily — a handful of pumpkin seeds as a snack works well' }
        : { food: 'Fatty fish (salmon, mackerel, sardines)', reason: 'Omega-3 fatty acids reduce cardiac inflammation and support healthy heart rhythm, reinforcing your current good baseline.', frequency: '3–4 times per week' },
      stressHigh
        ? { food: 'Ashwagandha tea or supplement (300mg KSM-66 extract)', reason: `Your stress index of ${stress} is high. Ashwagandha is clinically shown to reduce cortisol by 27% over 8 weeks, directly lowering your stress biomarkers and improving HRV.`, frequency: 'Once daily in the evening' }
        : { food: 'Dark chocolate (70%+ cacao, 30g portion)', reason: 'Flavonoids improve nitric oxide production in blood vessels, enhancing circulation and supporting HRV recovery — measurable in your next scan.', frequency: '2–3 times per week' },
      sdnnLow
        ? { food: 'Fermented foods (kefir, kimchi, Greek yoghurt)', reason: `Your SDNN of ${sdnn}ms indicates low HRV. The gut-heart axis is well-established — probiotic foods reduce systemic inflammation that suppresses parasympathetic activity, directly improving HRV over 4 weeks.`, frequency: 'One serving daily with a meal' }
        : { food: 'Colourful vegetables (5 different colours daily)', reason: 'Polyphenols reduce oxidative stress on cardiac tissue and support mitochondrial efficiency, improving scan outcomes over time.', frequency: 'At every meal' },
      bpHigh
        ? { food: 'Beetroot juice (200ml fresh or bottled)', reason: `Your BP of ${bp}mmHg is above optimal. Dietary nitrates in beetroot convert to nitric oxide in your arteries, clinically shown to reduce systolic BP by 4–10 mmHg within 3 hours. Drink it 2 hours before activity.`, frequency: 'Daily' }
        : { food: 'Avocado and bananas (potassium-rich)', reason: 'Potassium balances sodium\'s vasoconstrictive effect, protecting already-healthy blood pressure from future elevation.', frequency: 'Once daily' },
    ],
    exercise: [
      pulseHigh
        ? { activity: 'Zone 2 walking or light cycling', duration: '30 minutes', frequency: '5 days/week', reason: `Your pulse of ${pulse}bpm needs gentle cardiac conditioning. Zone 2 (60–70% max HR) specifically trains the heart to pump more efficiently, reducing resting heart rate by 5–10 bpm over 6 weeks without overloading your cardiovascular system.` }
        : { activity: 'Moderate aerobic exercise (swimming or cycling)', duration: '40 minutes', frequency: '4 days/week', reason: 'Regular moderate cardio strengthens vagal tone, improving HRV and maintaining your current healthy cardiovascular baseline.' },
      sdnnLow
        ? { activity: 'Restorative yoga or yin yoga', duration: '25 minutes', frequency: '3 times/week', reason: `Your SDNN of ${sdnn}ms shows low parasympathetic activity. The slow, sustained stretches in restorative yoga activate the vagus nerve directly, measurably increasing SDNN over 8 weeks of consistent practice.` }
        : { activity: 'Resistance training (bodyweight or weights)', duration: '30 minutes', frequency: '2–3 times/week', reason: 'Muscle strengthening improves insulin sensitivity and metabolic rate, supporting long-term wellness score improvement.' },
      stressHigh
        ? { activity: 'Tai chi or slow nature walks without headphones', duration: '20 minutes', frequency: 'Daily', reason: `Your stress index of ${stress} signals sympathetic dominance. Tai chi and unstructured outdoor movement lower salivary cortisol by 15–20% immediately after each session, improving parasympathetic recovery.` }
        : { activity: 'Cold face immersion (cold splash or cold shower finish)', duration: '30 seconds', frequency: 'Each morning', reason: 'Triggers the diving reflex via the vagus nerve, rapidly boosting parasympathetic tone and improving HRV within minutes.' },
    ],
    avoid: [
      stressHigh
        ? { item: 'Caffeine after 12 PM', reason: `Your stress index of ${stress} is already elevated. Caffeine's 5–7 hour half-life means an afternoon coffee keeps cortisol elevated into the evening, suppressing overnight HRV recovery and worsening your readings in tomorrow's scan.` }
        : { item: 'More than 2 coffees before noon', reason: 'Excess caffeine blunts the cortisol awakening response curve over time, reducing stress resilience and lowering HRV baseline.' },
      pulseHigh
        ? { item: 'High-sodium processed foods (>600mg sodium per serving)', reason: `With your pulse at ${pulse}bpm, excess sodium increases plasma volume, forcing your heart to work harder. This worsens both pulse rate and blood pressure — visible in your next scan within days.` }
        : { item: 'Ultra-processed foods (packaged snacks, fast food)', reason: 'These spike systemic inflammation within 2 hours of consumption, acutely suppressing HRV — measurable in the same day\'s scan.' },
      { item: 'Alcohol (even moderate amounts for 2 weeks)', reason: `Even 2 standard drinks suppresses SDNN by 10–15ms the following day. With your current HRV readings${sdnnLow ? ` of ${sdnn}ms` : ''}, this recovery window is critical to protect.` },
      { item: 'Screens within 1 hour of bedtime', reason: 'Blue light delays melatonin by 90 minutes, shortening deep sleep. Deep sleep is when HRV recovery and cortisol clearance primarily occur — cutting it short directly worsens next-day scan readings.' },
    ],
    lifestyle: [
      { habit: 'Sleep 7.5–8 hours in a room cooled to 18–19°C', reason: `Sleep is when your autonomic nervous system resets. Cooler temperatures accelerate entry into slow-wave sleep — where HRV recovery${sdnnLow ? ` (your SDNN is ${sdnn}ms)` : ''} and cortisol clearance happen. This is the single highest-impact change you can make.` },
      stressHigh
        ? { habit: '10 minutes of box breathing before bed (4 counts in, 4 hold, 4 out, 4 hold)', reason: `Your stress index of ${stress} indicates sympathetic dominance. Box breathing directly activates the dorsal vagal complex, measurably increasing SDNN within a single 10-minute session. Doing it before bed stacks the recovery during sleep.` }
        : { habit: 'Daily 10-minute outdoor walk without headphones first thing in the morning', reason: 'Morning light resets your circadian rhythm, precisely timing the cortisol awakening response. Walking without stimulation allows prefrontal cortex recovery, reducing baseline stress reactivity throughout the day.' },
      { habit: 'Stand up and walk 5 minutes every 50 minutes during desk work', reason: 'Prolonged sitting pools blood in the legs, forcing the heart to work harder. Micro-breaks restore normal circulation, preventing cumulative cardiovascular strain visible in pulse rate trends.' },
      wellness !== null && wellness < 6
        ? { habit: 'One meaningful social interaction daily (call, meetup, or voice message to a friend)', reason: `Your wellness index of ${wellness}/10 reflects holistic health strain. Oxytocin from genuine social connection directly lowers cortisol and improves HRV within 20 minutes — it\'s as measurable as exercise.` }
        : { habit: 'Gratitude journaling — 3 specific items each evening', reason: 'Activates prefrontal cortex and reduces amygdala reactivity, lowering baseline cortisol over 4–6 weeks and measurably improving wellness index scores.' },
    ],
    followup: concernCount >= 2
      ? `Given ${concernCount} metrics are outside the normal range, I recommend your next scan in 5–7 days so we can track whether these are trending back into range. Monitor your pulse rate and stress daily if possible. If you experience chest tightness, shortness of breath, dizziness, or persistent fatigue — don't wait for a scan, seek in-person medical attention immediately.`
      : `Your next scan in 10–14 days will confirm whether the changes I see are moving in the right direction. If any reading worsens — particularly pulse above 110bpm or stress level jumping to High — scan sooner.`,
    positive_note: diff.metrics.filter(m => m.trend === 'improved' && m.is_meaningful_change).length > 0
      ? `Your ${diff.metrics.filter(m => m.trend === 'improved' && m.is_meaningful_change).map(m => m.label).slice(0, 2).join(' and ')} ${diff.metrics.filter(m => m.trend === 'improved' && m.is_meaningful_change).length === 1 ? 'has' : 'have'} improved meaningfully — that is a genuine positive sign that your body is responding.`
      : 'Your commitment to regular health monitoring is itself a health-positive behaviour. Consistent scanning allows us to catch trends weeks before they would otherwise become apparent.',
  };
}

// ── Topic text ────────────────────────────────────────────────────────────────

function getTopicMarkdown(adv: any, t: Topic): string {
  if (!adv) return '';
  if (t === 'summary') {
    let md = `${adv.overall_assessment}\n\n`;
    if (adv.concern_flags?.length) {
      md += `### ⚠️ Areas Needing Attention\n`;
      adv.concern_flags.forEach((f: any) => {
        const text = typeof f === 'string' ? f : (f.metric ? `**${f.metric}**: ${f.reason}` : JSON.stringify(f));
        md += `- ${text}\n`;
      });
      md += '\n';
    }
    if (adv.positive_note) md += `> 💚 ${adv.positive_note}`;
    return md;
  }
  if (t === 'followup') return adv.followup || '';
  const HEADERS: Record<string, string> = {
    diet:      '### 🥗 Your Personalised Dietary Plan',
    exercise:  '### 🏃 Your Exercise Protocol',
    avoid:     '### 🚫 Based on Your Readings, Please Avoid',
    lifestyle: '### 🌿 Lifestyle Changes Tailored to Your Data',
  };
  const items = (adv[t] as any[]) || [];
  let md = `${HEADERS[t]}\n\n`;
  items.forEach((item: any, i: number) => {
    if (typeof item === 'string') { md += `${i + 1}. ${item}\n`; return; }
    if (t === 'diet') {
      md += `**${i + 1}. ${item.food}**\n`;
      md += `${item.reason}\n`;
      md += `*Frequency: ${item.frequency}*\n\n`;
    } else if (t === 'exercise') {
      md += `**${i + 1}. ${item.activity}** — ${item.duration}, ${item.frequency}\n`;
      md += `${item.reason}\n\n`;
    } else if (t === 'avoid') {
      md += `**${i + 1}. ${item.item}**\n`;
      md += `${item.reason}\n\n`;
    } else if (t === 'lifestyle') {
      md += `**${i + 1}. ${item.habit}**\n`;
      md += `${item.reason}\n\n`;
    }
  });
  return md;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const RISK_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  low:      { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
  moderate: { color: '#92400e', bg: '#fffbeb', border: '#fcd34d' },
  high:     { color: '#991b1b', bg: '#fef2f2', border: '#fca5a5' },
};

const TOPIC_META: Record<Topic, { label: string; icon: string }> = {
  summary:   { label: 'Summary',   icon: '🩺' },
  diet:      { label: 'Diet',      icon: '🥗' },
  exercise:  { label: 'Exercise',  icon: '🏃' },
  avoid:     { label: 'Avoid',     icon: '🚫' },
  lifestyle: { label: 'Lifestyle', icon: '🌿' },
  followup:  { label: 'Follow-up', icon: '📅' },
};

// ── Main component ────────────────────────────────────────────────────────────

const HealthDiffPage: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [diff, setDiff]     = useState<HealthDiff | null>(null);
  const [advice, setAdvice] = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [topic, setTopic]   = useState<Topic>('summary');
  const [displayed, setDisplayed] = useState('');
  const [typing, setTyping]   = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<any>(null);
  const isTalking = typing;

  const firstName = (user?.full_name || user?.email || 'Patient').split(' ')[0].split('@')[0];

  const typeText = (text: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayed(''); setProgress(0); setTyping(true);
    let i = 0;
    intervalRef.current = setInterval(() => {
      if (i >= text.length) {
        clearInterval(intervalRef.current); setTyping(false); setProgress(100); return;
      }
      setDisplayed(text.slice(0, i + 1));
      setProgress(Math.round((i + 1) / text.length * 100));
      i += 3; // faster for markdown (chunk 3 chars at a time)
    }, 12);
  };

  const switchTopic = (t: Topic) => {
    setTopic(t);
    if (advice) typeText(getTopicMarkdown(advice, t));
  };

  useEffect(() => {
    if (!token) return;
    apiFetch('/api/diff/latest', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404
          ? 'You need at least 2 scans to view a comparison.'
          : 'Failed to load comparison.');
        return r.json();
      })
      .then(async (data: HealthDiff) => {
        setDiff(data);
        setAdviceLoading(true);
        let adv: any;
        try { adv = await fetchGroqAdvice(data); }
        catch { adv = fallbackAdvice(data); }
        setAdvice(adv);
        typeText(getTopicMarkdown(adv, 'summary'));
        setAdviceLoading(false);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, background: '#f8fafc' }}>
      <div style={{ width: 48, height: 48, border: '4px solid #ccfbf1', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontSize: 15, color: '#64748b', textAlign: 'center', padding: '0 24px' }}>Loading your health consultation…</div>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', background: '#f8fafc', padding: '40px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '40px 28px', textAlign: 'center', width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, margin: '16px 0 10px', color: '#0f172a' }}>{error}</div>
        <button onClick={() => navigate('/dashboard')} style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 16, fontFamily: 'inherit', width: '100%' }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  if (!diff) return null;

  const metricMap = Object.fromEntries(diff.metrics.map(m => [m.key, m]));
  const riskLevel = (advice?.risk_level as string) || 'moderate';
  const riskStyle = RISK_STYLE[riskLevel] || RISK_STYLE.moderate;
  const reportDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const concerningMetrics = diff.metrics.filter(m => m.is_concerning);
  const STRIP_KEYS = ['pulse_rate', 'blood_pressure_systolic', 'oxygen_saturation', 'stress_index', 'sdnn', 'wellness_index'];
  const stripMetrics = STRIP_KEYS.map(k => metricMap[k]).filter(Boolean);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`
        @keyframes headBob{0%,100%{transform:translateY(0) rotate(0deg)}25%{transform:translateY(-5px) rotate(1.2deg)}75%{transform:translateY(-2px) rotate(-0.6deg)}}
        @keyframes mouthOpen{0%,100%{d:path("M 54 80 Q 60 82 66 80")}50%{d:path("M 54 80 Q 60 89 66 80")}}
        @keyframes blink{0%,88%,100%{transform:scaleY(1)}93%{transform:scaleY(0.08)}}
        @keyframes clipFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes pulseRing{0%{opacity:.7;r:6}100%{opacity:0;r:16}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes cursorBlink{50%{opacity:0}}
        .doc-head-anim{animation:${isTalking ? 'headBob 2.2s ease-in-out infinite' : 'none'};transform-origin:60px 60px;}
        .doc-mouth-anim{animation:${isTalking ? 'mouthOpen 0.32s ease-in-out infinite' : 'none'};}
        .doc-leye{animation:blink 3.8s ease-in-out infinite;transform-origin:50px 58px;}
        .doc-reye{animation:blink 3.8s ease-in-out 0.4s infinite;transform-origin:70px 58px;}
        .doc-clip{animation:clipFloat 3s ease-in-out infinite;}
        .pulse-ring{animation:pulseRing 1.6s ease-out infinite;}
        .cursor-blink{display:inline-block;width:2.5px;height:16px;background:#0f766e;margin-left:3px;vertical-align:middle;animation:cursorBlink 0.9s step-end infinite;}
        .topic-btn{cursor:pointer;border:1.5px solid #e2e8f0;border-radius:24px;padding:7px 14px;font-size:12px;font-weight:600;background:none;font-family:inherit;transition:all 0.15s;color:#64748b;display:flex;align-items:center;gap:5px;white-space:nowrap;}
        .topic-btn:hover{background:#f0fdfa;border-color:#0f766e;color:#0f766e;}
        .topic-btn.active{background:#0f766e;border-color:#0f766e;color:#fff;}
        .metric-card{background:#fff;border-radius:14px;padding:14px 12px;text-align:center;transition:transform 0.1s;cursor:default;}
        .metric-card:hover{transform:translateY(-2px);}

        /* ── Responsive layout ── */
        .consultation-body{display:flex;min-height:360px;}
        .doctor-panel{width:200px;flex-shrink:0;background:linear-gradient(180deg,#f0fdfa,#e6f7f5);display:flex;align-items:flex-end;justify-content:center;border-right:1px solid #e2e8f0;overflow:hidden;}
        .speech-panel{flex:1;padding:22px;display:flex;flex-direction:column;gap:14px;}
        .topic-scroll{display:flex;gap:8px;flex-wrap:wrap;}
        .metrics-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;}
        .navbar-date{font-size:13px;color:#94a3b8;font-weight:500;}

        @media (max-width: 640px) {
          .consultation-body{flex-direction:column;min-height:unset;}
          .doctor-panel{width:100%;height:160px;border-right:none;border-bottom:1px solid #e2e8f0;align-items:center;}
          .doctor-panel svg{width:130px;height:130px;}
          .speech-panel{padding:16px;}
          .topic-scroll{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;scrollbar-width:none;}
          .topic-scroll::-webkit-scrollbar{display:none;}
          .topic-btn{flex-shrink:0;}
          .metrics-grid{grid-template-columns:repeat(2,1fr);gap:8px;}
          .navbar-date{display:none;}
          .concern-banner{padding:14px 16px;}
          .concern-tags{gap:6px;}
        }

        @media (max-width: 380px) {
          .doctor-panel{height:130px;}
          .doctor-panel svg{width:105px;height:105px;}
          .metrics-grid{grid-template-columns:repeat(2,1fr);}
          .topic-btn{font-size:11px;padding:6px 11px;}
        }
      `}</style>

      {/* ── Navbar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', padding: '8px 0' }}>
          ← Dashboard
        </button>
        <span className="navbar-date">Health Consultation · {reportDate}</span>
      </div>

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '20px 12px 60px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* concern banner removed — metrics strip below already shows this */}

        {/* ── Doctor consultation card ── */}
        <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#0f766e,#0d9488)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', rowGap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccfbf1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <span style={{ color: '#ccfbf1', fontSize: 12, fontWeight: 600, flex: 1, minWidth: 0 }}>MyWellfie · Dr. Welfie MD · AI Health Consultation</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {advice && (
                <span style={{ background: riskStyle.bg, border: `1.5px solid ${riskStyle.border}`, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 800, color: riskStyle.color, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  {riskLevel.toUpperCase()} RISK
                </span>
              )}
              <svg width="12" height="12" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="7" fill="#4ade80"/>
                <circle className="pulse-ring" cx="10" cy="10" r="7" fill="#4ade80"/>
              </svg>
            </div>
          </div>

          {/* Doctor + speech */}
          <div className="consultation-body">

            {/* Doctor SVG */}
            <div className="doctor-panel">
              <svg className="doc-head-anim" viewBox="0 0 120 275" width="188" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="dsg4" cx="50%" cy="40%" r="60%"><stop offset="0%" stopColor="#fde8c8"/><stop offset="100%" stopColor="#f0a96a"/></radialGradient>
                  <radialGradient id="dcg4" cx="50%" cy="30%" r="70%"><stop offset="0%" stopColor="#ffffff"/><stop offset="100%" stopColor="#dde4ef"/></radialGradient>
                </defs>
                <ellipse cx="60" cy="60" rx="30" ry="33" fill="url(#dsg4)"/>
                <ellipse cx="60" cy="31" rx="28" ry="19" fill="#18120a"/>
                <ellipse cx="60" cy="41" rx="16" ry="10" fill="#18120a"/>
                <rect x="32" y="42" width="9" height="22" rx="4" fill="#18120a"/>
                <rect x="79" y="42" width="9" height="22" rx="4" fill="#18120a"/>
                <ellipse cx="31" cy="63" rx="5.5" ry="8" fill="url(#dsg4)"/>
                <ellipse cx="89" cy="63" rx="5.5" ry="8" fill="url(#dsg4)"/>
                <ellipse cx="31" cy="63" rx="2.5" ry="4.5" fill="#e8a878" opacity="0.5"/>
                <ellipse cx="89" cy="63" rx="2.5" ry="4.5" fill="#e8a878" opacity="0.5"/>
                <path d="M43 52 Q50 49 57 52" stroke="#18120a" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
                <path d="M63 52 Q70 49 77 52" stroke="#18120a" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
                <g className="doc-leye"><ellipse cx="50" cy="60" rx="6" ry="6.5" fill="white"/><circle cx="50" cy="61" r="4" fill="#18120a"/><circle cx="51.8" cy="59.2" r="1.5" fill="white"/></g>
                <g className="doc-reye"><ellipse cx="70" cy="60" rx="6" ry="6.5" fill="white"/><circle cx="70" cy="61" r="4" fill="#18120a"/><circle cx="71.8" cy="59.2" r="1.5" fill="white"/></g>
                <path d="M60 66 Q56 72 54 74 Q60 76 66 74 Q64 72 60 66" fill="#e09060" opacity="0.4"/>
                <path className="doc-mouth-anim" d="M 54 80 Q 60 82 66 80" stroke="#c0673a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
                <ellipse cx="43" cy="73" rx="7" ry="4.5" fill="#f4a261" opacity="0.2"/>
                <ellipse cx="77" cy="73" rx="7" ry="4.5" fill="#f4a261" opacity="0.2"/>
                <rect x="51" y="90" width="18" height="14" rx="4" fill="url(#dsg4)"/>
                <rect x="15" y="100" width="90" height="125" rx="16" fill="url(#dcg4)"/>
                <rect x="24" y="100" width="72" height="55" rx="10" fill="#0f766e" opacity="0.92"/>
                <path d="M36 100 Q30 122 33 134 Q36 144 46 146" stroke="#1e293b" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
                <circle cx="46" cy="148" r="6" fill="#334155"/>
                <path d="M84 100 Q90 122 87 134 Q84 144 74 146" stroke="#1e293b" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
                <path d="M46 146 Q60 162 74 146" stroke="#1e293b" strokeWidth="2.2" fill="none"/>
                <rect x="17" y="125" width="22" height="32" rx="5" fill="white" opacity="0.85"/>
                <rect x="21" y="131" width="14" height="2.5" rx="1.2" fill="#94a3b8"/>
                <rect x="21" y="137" width="11" height="2.5" rx="1.2" fill="#94a3b8"/>
                <rect x="21" y="143" width="13" height="2.5" rx="1.2" fill="#0f766e" opacity="0.6"/>
                <g className="doc-clip">
                  <rect x="64" y="103" width="33" height="44" rx="5" fill="white" stroke="#dde4ef" strokeWidth="1"/>
                  <rect x="73" y="99" width="15" height="9" rx="4.5" fill="#cbd5e1"/>
                  <rect x="68" y="115" width="25" height="2.5" rx="1.2" fill="#e2e8f0"/>
                  <rect x="68" y="122" width="21" height="2.5" rx="1.2" fill="#e2e8f0"/>
                  <rect x="68" y="129" width="23" height="2.5" rx="1.2" fill="#e2e8f0"/>
                  <rect x="68" y="136" width="17" height="2.5" rx="1.2" fill="#0f766e" opacity="0.6"/>
                </g>
                <rect x="17" y="108" width="7" height="10" rx="2.5" fill="#0f766e"/>
                <circle cx="20.5" cy="105" r="2.5" fill="#94a3b8"/>
                <rect x="28" y="218" width="26" height="52" rx="10" fill="#dde4ef"/>
                <rect x="66" y="218" width="26" height="52" rx="10" fill="#dde4ef"/>
                <rect x="28" y="260" width="26" height="12" rx="6" fill="#cbd5e1"/>
                <rect x="66" y="260" width="26" height="12" rx="6" fill="#cbd5e1"/>
              </svg>
            </div>

            {/* Speech panel */}
            <div className="speech-panel">
              <div style={{ fontSize: 14, color: '#64748b' }}>
                Good day, <strong style={{ color: '#0f172a', fontSize: 15 }}>{firstName}</strong>. I've carefully reviewed your biometric comparison.
              </div>

              {/* Topic pills — horizontally scrollable on mobile */}
              <div className="topic-scroll">
                {TOPICS.map(t => (
                  <button key={t} className={`topic-btn${topic === t ? ' active' : ''}`} onClick={() => switchTopic(t)}>
                    <span>{TOPIC_META[t].icon}</span> {TOPIC_META[t].label}
                  </button>
                ))}
              </div>

              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '4px 18px 18px 18px', padding: '16px 18px', fontSize: 14, lineHeight: 1.85, color: '#1e293b', flex: 1, minHeight: 160 }}>
                {adviceLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: 13 }}>
                    <div style={{ width: 20, height: 20, border: '2.5px solid #e2e8f0', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                    Generating your personalised consultation…
                  </div>
                ) : (
                  <div className="md-response">
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...p}) => <h3 style={{fontSize:14,fontWeight:700,color:'#0f766e',margin:'0 0 10px',borderBottom:'1px solid #e2e8f0',paddingBottom:6}} {...p}/>,
                        strong: ({node, ...p}) => <strong style={{fontWeight:700,color:'#0f172a'}} {...p}/>,
                        p: ({node, ...p}) => <p style={{margin:'0 0 10px',lineHeight:1.85}} {...p}/>,
                        li: ({node, ...p}) => <li style={{marginBottom:6,lineHeight:1.75}} {...p}/>,
                        ul: ({node, ...p}) => <ul style={{paddingLeft:20,margin:'0 0 10px'}} {...p}/>,
                        ol: ({node, ...p}) => <ol style={{paddingLeft:20,margin:'0 0 10px'}} {...p}/>,
                        em: ({node, ...p}) => <em style={{color:'#64748b',fontStyle:'italic'}} {...p}/>,
                        blockquote: ({node, ...p}) => <blockquote style={{borderLeft:'3px solid #0f766e',paddingLeft:12,margin:'8px 0',color:'#334155',fontStyle:'italic'}} {...p}/>,
                      }}
                    >
                      {displayed}
                    </ReactMarkdown>
                    {typing && <span className="cursor-blink" />}
                  </div>
                )}
              </div>

              <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2 }}>
                <div style={{ height: '100%', background: '#0f766e', borderRadius: 2, width: `${progress}%`, transition: 'width 0.05s linear' }} />
              </div>
            </div>
          </div>

          {/* Metrics strip */}
          <div style={{ padding: '18px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Biometric Changes — Previous vs Current
            </div>
            <div className="metrics-grid">
              {stripMetrics.map(m => {
                const bg      = m.is_concerning ? '#fef2f2' : '#fff';
                const border  = m.is_concerning ? '1.5px solid #fca5a5' : '1.5px solid #e2e8f0';
                const valColor = m.is_concerning ? '#991b1b' : '#0f172a';
                let deltaColor = '#64748b';
                if (m.is_meaningful_change && m.delta !== null) {
                  if (m.higher_is_better === true)  deltaColor = m.delta > 0 ? '#16a34a' : '#dc2626';
                  if (m.higher_is_better === false) deltaColor = m.delta < 0 ? '#16a34a' : '#dc2626';
                }
                return (
                  <div className="metric-card" key={m.key} style={{ border, background: bg }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: valColor, lineHeight: 1 }}>
                      {m.current ?? '—'}
                      <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400, marginLeft: 2 }}>{m.unit}</span>
                    </div>
                    {m.is_meaningful_change && m.delta !== null ? (
                      <div style={{ fontSize: 13, fontWeight: 700, color: deltaColor, marginTop: 6 }}>
                        {m.delta > 0 ? '+' : ''}{m.delta} {m.unit}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>No change</div>
                    )}
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>was {m.previous ?? '—'}{m.unit}</div>
                    {m.is_concerning ? (
                      <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: '#991b1b', background: '#fff', border: '1px solid #fca5a5', borderRadius: 6, padding: '2px 7px', display: 'inline-block' }}>⚠ Concern</div>
                    ) : (
                      <div style={{ marginTop: 6, fontSize: 10, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '2px 7px', display: 'inline-block' }}>✓ Normal</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', border: '1px solid #e2e8f0' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.65 }}>
            <strong style={{ color: '#64748b' }}>Medical Disclaimer:</strong> This consultation is AI-generated from biometric scan data for informational purposes only. It does not constitute a medical diagnosis or replace advice from a qualified healthcare professional.
          </p>
        </div>

      </div>
    </div>
  );
};

export default HealthDiffPage;