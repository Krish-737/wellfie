import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { ScanResult } from '../../content/scanIndicators';
import { evaluateSdkScanQuality } from '../../utils/metricAvailability';
import { typography } from '../../style/tokens';

interface ScanQualityBannerProps {
  scan: ScanResult;
  isMobile?: boolean;
  compact?: boolean;
}

const confidenceChipColor = (level: string): { bg: string; text: string; border: string } => {
  if (level === 'High') return { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' };
  if (level === 'Medium') return { bg: '#fffbeb', text: '#92400e', border: '#fde68a' };
  return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' };
};

const ScanQualityBanner: React.FC<ScanQualityBannerProps> = ({
  scan,
  isMobile = false,
  compact = false,
}) => {
  const quality = useMemo(() => evaluateSdkScanQuality(scan), [scan]);
  const [expanded, setExpanded] = useState(!compact);

  const capturedCount = quality.completeness.filter((c) => c.met).length;
  const totalCount = quality.completeness.length;
  const hasContent = /* quality.shouldRetake || */ capturedCount < totalCount;

  if (!hasContent && quality.durationSec == null) {
    return null;
  }

  return (
    <section
      style={{
        marginBottom: 16,
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        background: '#ffffff',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden',
        fontFamily: typography.fontFamily,
      }}
    >
      {/* Consider retaking this scan — temporarily hidden
      {quality.shouldRetake && quality.retakeMessage && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            padding: isMobile ? '14px 14px' : '16px 18px',
            borderBottom: expanded ? '1px solid #fde68a' : 'none',
          }}
        >
          <AlertTriangle
            size={20}
            color="#b45309"
            strokeWidth={2.2}
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: '0 0 8px',
                fontSize: isMobile ? 13 : 14,
                fontWeight: 700,
                color: '#92400e',
              }}
            >
              Consider retaking this scan
            </p>
            <p style={{ margin: 0, fontSize: isMobile ? 12 : 13, color: '#78350f', lineHeight: 1.55 }}>
              {quality.retakeMessage}
            </p>
            {quality.lowConfidenceMetrics.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {quality.lowConfidenceMetrics.map(({ label, level }) => {
                  const colors = confidenceChipColor(level);
                  return (
                    <span
                      key={label}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {label}: {level}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      */}

      <div style={{ padding: isMobile ? '12px 14px' : '14px 18px' }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={16} color="#64748b" strokeWidth={2.2} />
            <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: '#334155' }}>
              Scan completeness
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {capturedCount}/{totalCount} metrics
              {quality.durationSec != null && ` · ${Math.round(quality.durationSec)}s`}
            </span>
          </div>
          {expanded ? (
            <ChevronUp size={18} color="#94a3b8" />
          ) : (
            <ChevronDown size={18} color="#94a3b8" />
          )}
        </button>

        {expanded && (
          <ul
            style={{
              listStyle: 'none',
              margin: '12px 0 0',
              padding: 0,
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 8,
            }}
          >
            {quality.completeness.map((item) => (
              <li
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: item.met ? '#334155' : '#64748b',
                }}
              >
                {item.met ? (
                  <CheckCircle2 size={15} color="#0f766e" strokeWidth={2.4} />
                ) : (
                  <span
                    style={{
                      width: 15,
                      height: 15,
                      borderRadius: '50%',
                      border: '2px solid #cbd5e1',
                      flexShrink: 0,
                    }}
                  />
                )}
                <span style={{ fontWeight: 600 }}>{item.label}</span>
                {!item.met && (
                  <span style={{ color: '#94a3b8', fontWeight: 500 }}>— {item.detail}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default ScanQualityBanner;
