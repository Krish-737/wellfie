import React, { useEffect } from 'react';
import { MISSING_VALUE, type IndicatorDef, type ScanResult } from '../../content/scanIndicators';
import {
  getIndicatorConfidence,
  getIndicatorMissingReason,
} from '../../utils/metricAvailability';
import { getMetricBadges } from '../../content/metricSpec';
import IndicatorIcon from './IndicatorIcon';
import MetricDisclaimerBadges from '../health/MetricDisclaimerBadges';

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

const IndicatorModal: React.FC<{
  indicator: IndicatorDef;
  scan: ScanResult;
  idx: number;
  total: number;
  onClose(): void;
  onPrev(): void;
  onNext(): void;
}> = ({ indicator, scan, idx, total, onClose, onPrev, onNext }) => {
  const value = indicator.getValue(scan);
  const status = indicator.getStatus(scan);
  const missingReason = value === MISSING_VALUE ? getIndicatorMissingReason(indicator.id, scan) : null;
  const confidenceLabel = getIndicatorConfidence(indicator.id, scan);
  const disclaimerBadges = getMetricBadges(indicator.id, scan);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460,
        boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
        overflow: 'hidden', animation: 'mwSlideUp .2s ease',
      }}>
        <div style={{
          background: `linear-gradient(135deg,${indicator.catColor}22,${indicator.catColor}0a)`,
          borderBottom: '1px solid #e2e8f0', padding: '20px 20px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 13,
                background: `${indicator.catColor}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IndicatorIcon id={indicator.id} color={indicator.catColor} size={24} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: indicator.catColor, marginBottom: 2 }}>
                  {indicator.category}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{indicator.label}</div>
                <MetricDisclaimerBadges badges={disclaimerBadges} className="mt-2" />
              </div>
            </div>
            <button type="button" onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 7px', cursor: 'pointer', color: '#64748b', display: 'flex', lineHeight: 1 }}>
              <CloseIcon />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
              {value === MISSING_VALUE ? <span style={{ color: '#cbd5e1' }}>{MISSING_VALUE}</span> : value}
            </div>
            <span style={{
              fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '4px 12px',
              background: status.bg, color: status.color, border: `1px solid ${status.border}`,
            }}>
              {status.label}
            </span>
            {confidenceLabel && confidenceLabel !== 'Unknown' && (
              <span style={{
                fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '4px 12px',
                background: confidenceLabel === 'High' ? '#f0fdf4' : confidenceLabel === 'Medium' ? '#fffbeb' : '#fef2f2',
                color: confidenceLabel === 'High' ? '#166534' : confidenceLabel === 'Medium' ? '#92400e' : '#991b1b',
                border: `1px solid ${confidenceLabel === 'High' ? '#bbf7d0' : confidenceLabel === 'Medium' ? '#fde68a' : '#fecaca'}`,
              }}>
                {confidenceLabel} confidence
              </span>
            )}
          </div>
          {missingReason && (
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 8, lineHeight: 1.5 }}>
              {missingReason}
            </div>
          )}
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
            <span style={{ fontWeight: 600 }}>Target: </span>{indicator.target}
          </div>
        </div>

        <div style={{ padding: '18px 20px 20px' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#0f172a', marginBottom: 6 }}>
              What this measures
            </div>
            <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.68, margin: 0 }}>{indicator.whatItMeans}</p>
          </div>

          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 5 }}>When to take action</div>
            <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6, margin: 0 }}>{indicator.whenToAct}</p>
          </div>

          <a href={indicator.link} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', textAlign: 'center', padding: '10px', background: '#f0fdfa', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#0f766e', textDecoration: 'none', border: '1px solid #99f6e4' }}>
            Learn more →
          </a>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <button type="button" onClick={onPrev} disabled={idx === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', cursor: idx > 0 ? 'pointer' : 'default', opacity: idx > 0 ? 1 : 0.3, fontSize: 13, fontWeight: 600, color: '#374151', fontFamily: 'inherit' }}>
            <ChevronLeftIcon /> Prev
          </button>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{idx + 1} / {total}</span>
          <button type="button" onClick={onNext} disabled={idx === total - 1}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', cursor: idx < total - 1 ? 'pointer' : 'default', opacity: idx < total - 1 ? 1 : 0.3, fontSize: 13, fontWeight: 600, color: '#374151', fontFamily: 'inherit' }}>
            Next <ChevronRightIcon />
          </button>
        </div>
      </div>

      <style>{`@keyframes mwSlideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
};

export default IndicatorModal;
