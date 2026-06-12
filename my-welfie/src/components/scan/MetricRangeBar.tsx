import React, { useEffect, useRef } from 'react';
import { clampPct } from '../../utils/cardiovascularMetricContext';
import { typography } from '../../style/tokens';

// ── Visualization type detection ───────────────────────────────────────────────
// Pass `metricId` from the parent to get the right widget automatically.
// Falls back to the classic gradient bar if metricId is unknown.

type VizType = 'gradient-bar' | 'dot-segment' | 'radial-arc' | 'risk-shield' | 'pill-strip';

const DOT_SEGMENT_IDS = new Set(['pns', 'sns', 'stress_level', 'wellness_level']);
const RADIAL_ARC_IDS  = new Set(['spo2', 'hba1c', 'normalized_stress_index', 'hemoglobin']);
const RISK_SHIELD_IDS = new Set(['ascvd', 'bp_risk', 'glucose_risk', 'cholesterol_risk']);
const PILL_STRIP_IDS  = new Set(['stress_level', 'wellness_level']);

function detectViz(metricId?: string): VizType {
  if (!metricId) return 'gradient-bar';
  if (PILL_STRIP_IDS.has(metricId))   return 'pill-strip';
  if (DOT_SEGMENT_IDS.has(metricId))  return 'dot-segment';
  if (RADIAL_ARC_IDS.has(metricId))   return 'radial-arc';
  if (RISK_SHIELD_IDS.has(metricId))  return 'risk-shield';
  return 'gradient-bar';
}

// ── Colour helpers ─────────────────────────────────────────────────────────────

function lerpColor(a: string, b: string, t: number): string {
  const hex = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bv = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bv})`;
}

// Red → Yellow → Green gradient for range bar
function rangeGradientColor(pct: number): string {
  if (pct <= 0.5) return lerpColor('#ef4444', '#f59e0b', pct * 2);
  return lerpColor('#f59e0b', '#10b981', (pct - 0.5) * 2);
}

// ── 1. Gradient range bar ──────────────────────────────────────────────────────

const GradientBar: React.FC<{
  value: number | null;
  scaleMin: number; scaleMax: number;
  optimalMin?: number; optimalMax?: number;
  accentColor: string; statusColor: string;
  isFeatured: boolean;
  targetDisplay?: string;
  scaleLeftLabel?: string; scaleRightLabel?: string;
}> = ({ value, scaleMin, scaleMax, optimalMin, optimalMax, accentColor, statusColor, isFeatured, targetDisplay, scaleLeftLabel, scaleRightLabel }) => {
  const trackH = isFeatured ? 10 : 8;
  const markerSize = 14;
  const optL  = optimalMin != null ? clampPct(optimalMin, scaleMin, scaleMax) : null;
  const optW  = optL != null && optimalMax != null
    ? clampPct(optimalMax, scaleMin, scaleMax) - optL : null;
  const mPct  = value != null ? clampPct(value, scaleMin, scaleMax) : null;
  const mColor = mPct != null ? rangeGradientColor(mPct / 100) : statusColor;

  return (
    <div aria-hidden>
      <div style={{ position: 'relative', height: trackH, borderRadius: 9999, overflow: 'visible',
        background: 'linear-gradient(to right, #ef444444 0%, #f59e0b44 50%, #10b98144 100%)' }}>
        {/* Optimal zone highlight */}
        {optL != null && optW != null && optW > 0 && (
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${optL}%`, width: `${optW}%`,
            borderRadius: 9999, background: `${accentColor}50`, border: `1.5px solid ${accentColor}88` }} />
        )}
        {/* Needle marker */}
        {mPct != null && (
          <div style={{ position: 'absolute', top: '50%', left: `${mPct}%`, width: markerSize, height: markerSize,
            transform: 'translate(-50%, -50%)', borderRadius: '50%',
            border: '2.5px solid white', boxShadow: `0 0 0 2px ${mColor}55, 0 2px 6px rgba(0,0,0,0.2)`,
            background: mColor, zIndex: 2,
            transition: 'left 0.6s cubic-bezier(0.34,1.56,0.64,1)' }} />
        )}
      </div>
      {isFeatured && targetDisplay && (
        <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 11, fontWeight: 800,
          letterSpacing: '0.07em', textTransform: 'uppercase', color: accentColor, lineHeight: 1.2 }}>
          TARGET: {targetDisplay}
        </p>
      )}
      <div style={{ marginTop: isFeatured && targetDisplay ? 4 : 6, display: 'flex',
        justifyContent: 'space-between', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8' }}>
        <span>{isFeatured ? scaleLeftLabel : scaleMin}</span>
        <span>{isFeatured ? scaleRightLabel : scaleMax}</span>
      </div>
    </div>
  );
};

// ── 2. Dot-segment scale ───────────────────────────────────────────────────────
// Used for PNS Zone, SNS Zone (3 levels: Low / Normal / High)

const DOT_CONFIGS: Record<string, { labels: string[]; colors: string[]; goodIdx: number }> = {
  pns:     { labels: ['Low','Normal','High'],  colors: ['#f59e0b','#10b981','#f59e0b'], goodIdx: 1 },
  sns:     { labels: ['Low','Normal','High'],  colors: ['#f59e0b','#10b981','#f59e0b'], goodIdx: 1 },
  default: { labels: ['Low','Normal','High'],  colors: ['#10b981','#f59e0b','#ef4444'], goodIdx: 0 },
};

const DotSegment: React.FC<{
  value: number | null; // raw enum value 1/2/3
  accentColor: string;
  metricId: string;
}> = ({ value, accentColor, metricId }) => {
  const cfg = DOT_CONFIGS[metricId] ?? DOT_CONFIGS.default;
  const activeIdx = value != null ? Math.min(Math.max(value - 1, 0), cfg.labels.length - 1) : -1;

  return (
    <div aria-hidden style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        {cfg.labels.map((lbl, i) => {
          const isActive = i === activeIdx;
          const color = cfg.colors[i];
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ position: 'relative', width: isActive ? 22 : 14, height: isActive ? 22 : 14,
                borderRadius: '50%', background: isActive ? color : '#e2e8f0',
                border: isActive ? `3px solid ${color}` : '2px solid #cbd5e1',
                boxShadow: isActive ? `0 0 0 4px ${color}30, 0 2px 8px ${color}50` : 'none',
                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                animation: isActive ? 'dotPulse 2s ease-in-out infinite' : 'none' }}>
                {isActive && (
                  <div style={{ position: 'absolute', inset: -6, borderRadius: '50%',
                    border: `2px solid ${color}40`,
                    animation: 'dotRing 1.6s ease-out infinite' }} />
                )}
              </div>
              <span style={{ fontSize: 9, fontWeight: isActive ? 800 : 500,
                color: isActive ? color : '#94a3b8', letterSpacing: '0.04em',
                textTransform: 'uppercase', transition: 'color 0.2s' }}>
                {lbl}
              </span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes dotPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
        @keyframes dotRing  { 0%{opacity:.8;transform:scale(.6)} 100%{opacity:0;transform:scale(1.8)} }
      `}</style>
    </div>
  );
};

// ── 3. Radial arc gauge ────────────────────────────────────────────────────────
// Used for SpO₂, HbA1c, Normalized Stress — percentage-style metrics

const RadialArc: React.FC<{
  value: number | null;
  scaleMin: number; scaleMax: number;
  statusColor: string; accentColor: string;
  targetDisplay?: string;
  isFeatured: boolean;
}> = ({ value, scaleMin, scaleMax, statusColor, accentColor, targetDisplay, isFeatured }) => {
  const pct = value != null ? Math.min(1, Math.max(0, (value - scaleMin) / (scaleMax - scaleMin))) : 0;
  const r = 36, cx = 50, cy = 50;
  const startAngle = -210; // degrees — wide arc from bottom-left to bottom-right
  const sweepRange = 240;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (pctFill: number) => {
    const start = toRad(startAngle);
    const end   = toRad(startAngle + sweepRange * pctFill);
    const laf   = sweepRange * pctFill > 180 ? 1 : 0;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${laf} 1 ${x2} ${y2}`;
  };
  const fillColor = rangeGradientColor(pct);
  const size = isFeatured ? 96 : 80;

  return (
    <div aria-hidden style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size * 0.72} viewBox="0 0 100 72">
        {/* Track */}
        <path d={arcPath(1)} fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />
        {/* Fill */}
        {value != null && (
          <path d={arcPath(pct)} fill="none" stroke={fillColor} strokeWidth="8" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${fillColor}80)` }} />
        )}
        {/* Tip glow dot */}
        {value != null && pct > 0.02 && (() => {
          const angle = toRad(startAngle + sweepRange * pct);
          const tx = cx + r * Math.cos(angle);
          const ty = cy + r * Math.sin(angle);
          return <circle cx={tx} cy={ty} r="5" fill={fillColor} style={{ filter: `drop-shadow(0 0 3px ${fillColor})` }} />;
        })()}
      </svg>
      {targetDisplay && (
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: accentColor }}>
          TARGET: {targetDisplay}
        </div>
      )}
    </div>
  );
};

// ── 4. Risk shield ─────────────────────────────────────────────────────────────
// Used for ASCVD, BP Risk, Glucose Risk, Cholesterol Risk

const RISK_COLORS: Record<string, string> = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', unknown: '#94a3b8' };
const RISK_LABELS: Record<number, string>  = { 0: 'Unknown', 1: 'Low', 2: 'Medium', 3: 'High' };

const RiskShield: React.FC<{
  value: number | null;   // enum 0–3
  isFeatured: boolean;
}> = ({ value, isFeatured }) => {
  const label = value != null ? (RISK_LABELS[value] ?? 'Unknown') : 'Unknown';
  const color = RISK_COLORS[label.toLowerCase()] ?? RISK_COLORS.unknown;
  const fillPct = value != null ? [0, 0.22, 0.55, 1][Math.min(value, 3)] : 0;
  const shieldH = isFeatured ? 56 : 46;

  return (
    <div aria-hidden style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={shieldH * 0.8} height={shieldH} viewBox="0 0 40 50">
        <defs>
          <clipPath id="shieldClip">
            <path d="M20 2 L36 8 L36 26 Q36 40 20 48 Q4 40 4 26 L4 8 Z" />
          </clipPath>
        </defs>
        {/* Shield outline */}
        <path d="M20 2 L36 8 L36 26 Q36 40 20 48 Q4 40 4 26 L4 8 Z"
          fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
        {/* Liquid fill from bottom */}
        <rect x="0" y={50 - 50 * fillPct} width="50" height={50 * fillPct}
          fill={`${color}55`} clipPath="url(#shieldClip)"
          style={{ transition: 'y 0.8s cubic-bezier(0.34,1.56,0.64,1), height 0.8s' }} />
        {/* Shield border colored */}
        <path d="M20 2 L36 8 L36 26 Q36 40 20 48 Q4 40 4 26 L4 8 Z"
          fill="none" stroke={color} strokeWidth="2" opacity="0.8" />
      </svg>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color,
          boxShadow: `0 0 6px ${color}` }} />
        <span style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: '0.05em',
          textTransform: 'uppercase' }}>
          {label} Risk
        </span>
      </div>
    </div>
  );
};

// ── 5. Pill strip ──────────────────────────────────────────────────────────────
// Used for Stress Level (Very Low / Low / Normal / High / Extreme)

const STRESS_PILLS = [
  { label: 'V.Low', value: 1, color: '#10b981' },
  { label: 'Low',   value: 2, color: '#34d399' },
  { label: 'Normal',value: 3, color: '#f59e0b' },
  { label: 'High',  value: 4, color: '#f97316' },
  { label: 'Extreme',value:5, color: '#ef4444' },
];
const WELLNESS_PILLS = [
  { label: 'Low',    value: 1, color: '#ef4444' },
  { label: 'Normal', value: 2, color: '#10b981' },
  { label: 'High',   value: 3, color: '#0f766e' },
];

const PillStrip: React.FC<{
  value: number | null;
  metricId: string;
}> = ({ value, metricId }) => {
  const pills = metricId === 'wellness_level' ? WELLNESS_PILLS : STRESS_PILLS;
  const activeIdx = pills.findIndex(p => p.value === value);

  return (
    <div aria-hidden style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
      {pills.map((p, i) => {
        const isActive = i === activeIdx;
        return (
          <div key={i} style={{
            padding: isActive ? '4px 10px' : '3px 8px',
            borderRadius: 20,
            fontSize: isActive ? 11 : 10,
            fontWeight: isActive ? 800 : 500,
            background: isActive ? p.color : '#f1f5f9',
            color: isActive ? '#fff' : '#94a3b8',
            border: isActive ? `2px solid ${p.color}` : '1.5px solid #e2e8f0',
            boxShadow: isActive ? `0 0 10px ${p.color}55` : 'none',
            letterSpacing: '0.04em',
            transition: 'all 0.2s',
            textTransform: 'uppercase',
          }}>
            {p.label}
          </div>
        );
      })}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

interface MetricRangeBarProps {
  value: number | null;
  scaleMin: number;
  scaleMax: number;
  optimalMin?: number;
  optimalMax?: number;
  accentColor: string;
  statusColor?: string;
  variant?: 'default' | 'featured' | 'recovery';
  targetDisplay?: string;
  scaleLeftLabel?: string;
  scaleRightLabel?: string;
  /** Pass the indicator id to auto-select the right visualization */
  metricId?: string;
  /** Raw enum value for dot/pill/shield widgets */
  enumValue?: number | null;
}

const MetricRangeBar: React.FC<MetricRangeBarProps> = ({
  value,
  scaleMin,
  scaleMax,
  optimalMin,
  optimalMax,
  accentColor,
  statusColor = accentColor,
  variant = 'default',
  targetDisplay,
  scaleLeftLabel,
  scaleRightLabel,
  metricId,
  enumValue,
}) => {
  const isFeatured = variant === 'featured' || variant === 'recovery';
  const viz = detectViz(metricId);

  // Dot-segment and pill-strip use the raw enum value
  const rawEnum = enumValue ?? value;

  if (viz === 'pill-strip') {
    return (
      <div style={{ fontFamily: typography.fontFamily }} aria-hidden>
        <PillStrip value={rawEnum} metricId={metricId!} />
        {isFeatured && targetDisplay && (
          <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 11, fontWeight: 800,
            letterSpacing: '0.07em', textTransform: 'uppercase', color: accentColor }}>
            TARGET: {targetDisplay}
          </p>
        )}
      </div>
    );
  }

  if (viz === 'dot-segment') {
    return (
      <div style={{ fontFamily: typography.fontFamily }} aria-hidden>
        <DotSegment value={rawEnum} accentColor={accentColor} metricId={metricId!} />
        {isFeatured && targetDisplay && (
          <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 11, fontWeight: 800,
            letterSpacing: '0.07em', textTransform: 'uppercase', color: accentColor }}>
            TARGET: {targetDisplay}
          </p>
        )}
      </div>
    );
  }

  if (viz === 'radial-arc') {
    return (
      <div style={{ fontFamily: typography.fontFamily }} aria-hidden>
        <RadialArc value={value} scaleMin={scaleMin} scaleMax={scaleMax}
          statusColor={statusColor} accentColor={accentColor}
          targetDisplay={isFeatured ? targetDisplay : undefined}
          isFeatured={isFeatured} />
      </div>
    );
  }

  if (viz === 'risk-shield') {
    return (
      <div style={{ fontFamily: typography.fontFamily }} aria-hidden>
        <RiskShield value={rawEnum} isFeatured={isFeatured} />
      </div>
    );
  }

  // Default: gradient range bar
  return (
    <div style={{ fontFamily: typography.fontFamily }} aria-hidden>
      <GradientBar value={value} scaleMin={scaleMin} scaleMax={scaleMax}
        optimalMin={optimalMin} optimalMax={optimalMax}
        accentColor={accentColor} statusColor={statusColor}
        isFeatured={isFeatured} targetDisplay={targetDisplay}
        scaleLeftLabel={scaleLeftLabel} scaleRightLabel={scaleRightLabel} />
    </div>
  );
};

export default MetricRangeBar;