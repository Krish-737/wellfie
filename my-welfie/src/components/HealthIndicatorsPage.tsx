import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  INDICATOR_CATEGORIES,
  INDICATORS,
  type ScanResult,
} from '../content/scanIndicators';
import IndicatorModal from './scan/IndicatorModal';
import MetricTile from './scan/MetricTile';

export type { ScanResult } from '../content/scanIndicators';

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

const HealthIndicatorsCarousel: React.FC<{
  scan: ScanResult;
  isMobile?: boolean;
}> = ({ scan, isMobile = false }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const checkEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    checkEdges();
    const el = scrollRef.current;
    el?.addEventListener('scroll', checkEdges, { passive: true });
    window.addEventListener('resize', checkEdges);
    return () => {
      el?.removeEventListener('scroll', checkEdges);
      window.removeEventListener('resize', checkEdges);
    };
  }, [checkEdges]);

  const scroll = (dir: 'left' | 'right') =>
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });

  const CARD_W = isMobile ? 155 : 168;

  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', paddingTop: isMobile ? 20 : 24, paddingBottom: isMobile ? 16 : 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '0 16px 14px' : '0 28px 16px' }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>Health Indicators</h2>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '3px 0 0' }}>
            {INDICATORS.length} metrics from your latest scan — tap any card for full details
          </p>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', gap: 8 }}>
            {(['left', 'right'] as const).map((dir) => {
              const active = dir === 'left' ? canLeft : canRight;
              return (
                <button key={dir} type="button" onClick={() => scroll(dir)} disabled={!active}
                  style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid #e2e8f0', background: active ? '#f8fafc' : '#f1f5f9', cursor: active ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#374151' : '#cbd5e1', opacity: active ? 1 : 0.4 }}>
                  {dir === 'left' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        {canLeft && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 28, background: 'linear-gradient(to right,#fff 60%,transparent)', zIndex: 2, pointerEvents: 'none' }} />}
        {canRight && <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 28, background: 'linear-gradient(to left,#fff 60%,transparent)', zIndex: 2, pointerEvents: 'none' }} />}

        <div
          ref={scrollRef}
          style={{
            display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none',
            msOverflowStyle: 'none', padding: isMobile ? '4px 16px 8px' : '4px 28px 8px',
          } as React.CSSProperties}
        >
          {INDICATORS.map((ind, idx) => (
            <div key={ind.id} style={{ flexShrink: 0, width: CARD_W }}>
              <MetricTile
                indicator={ind}
                scan={scan}
                variant="compact"
                onClick={() => setActiveIdx(idx)}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', padding: isMobile ? '10px 16px 0' : '10px 28px 0' }}>
        {INDICATOR_CATEGORIES.map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
          </div>
        ))}
      </div>

      {activeIdx !== null && (
        <IndicatorModal
          indicator={INDICATORS[activeIdx]}
          scan={scan}
          idx={activeIdx}
          total={INDICATORS.length}
          onClose={() => setActiveIdx(null)}
          onPrev={() => setActiveIdx((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setActiveIdx((i) => Math.min(INDICATORS.length - 1, (i ?? 0) + 1))}
        />
      )}
    </div>
  );
};

export default HealthIndicatorsCarousel;
