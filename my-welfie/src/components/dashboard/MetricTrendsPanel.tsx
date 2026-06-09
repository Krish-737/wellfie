import React, { useMemo, useState } from 'react';
import type { ScanResult } from '../../content/scanIndicators';
import { colors, typography } from '../../style/tokens';
import {
  buildMetricTrendSeries,
  DEFAULT_TREND_METRIC,
  formatTrendDelta,
  formatTrendValue,
  isLowSdkConfidence,
  TREND_METRICS,
  TREND_WINDOWS,
  trendConfidenceRingColor,
  type TrendMetricConfig,
  type TrendMetricId,
  type TrendPoint,
  type TrendWindow,
} from '../../utils/metricTrend';
import { formatScanHeadline } from '../../utils/formatScanTime';

interface MetricTrendsPanelProps {
  scans: ScanResult[];
  loading?: boolean;
  isMobile?: boolean;
}

const CHART_GRADIENT_ID = 'metricTrendAreaGrad';

function smoothLinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function shouldShowXLabel(index: number, total: number): boolean {
  if (total <= 7) return true;
  if (total <= 12) return index % 2 === 0 || index === total - 1;
  return index % 3 === 0 || index === total - 1;
}

interface TrendChartProps {
  points: TrendPoint[];
  yMin: number;
  yMax: number;
  metric: TrendMetricConfig;
}

const TrendChart: React.FC<TrendChartProps> = ({ points, yMin, yMax, metric }) => {
  const { color, unit } = metric;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const W = 560;
  const H = 150;
  const PAD = { t: 14, r: 16, b: 32, l: 36 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const ySpan = yMax - yMin || 1;
  const yPos = (v: number) => PAD.t + plotH - ((v - yMin) / ySpan) * plotH;

  const plotPoints = useMemo(() => {
    if (points.length === 0) return [];
    const step = points.length === 1 ? 0 : plotW / (points.length - 1);
    return points.map((p, i) => ({
      ...p,
      x: PAD.l + step * i,
      y: yPos(p.value),
    }));
  }, [points, plotW, yMin, ySpan]);

  const gridValues = useMemo(() => {
    const mid = (yMin + yMax) / 2;
    return [yMin, mid, yMax].map((v) => Math.round(v * 10) / 10);
  }, [yMin, yMax]);

  const linePath = smoothLinePath(plotPoints);
  const areaPath =
    plotPoints.length >= 2
      ? `${linePath} L${plotPoints[plotPoints.length - 1].x},${H - PAD.b} L${plotPoints[0].x},${H - PAD.b} Z`
      : '';

  const hovered = hoveredIndex != null ? plotPoints[hoveredIndex] : null;

  if (points.length === 0) {
    return (
      <div
        style={{
          height: H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: 13,
          fontFamily: typography.fontFamily,
        }}
      >
        No data for this metric in the selected scans.
      </div>
    );
  }

  if (points.length === 1) {
    const p = plotPoints[0];
    return (
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
          <line
            x1={PAD.l}
            y1={p.y}
            x2={W - PAD.r}
            y2={p.y}
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <circle cx={W / 2} cy={p.y} r="5" fill={color} stroke="#fff" strokeWidth="2" />
          <text x={W / 2} y={H - 6} fontSize="10" fill="#94a3b8" textAnchor="middle">
            Latest
          </text>
        </svg>
        <p
          style={{
            margin: '8px 0 0',
            fontSize: 12,
            color: '#64748b',
            textAlign: 'center',
            fontFamily: typography.fontFamily,
          }}
        >
          One scan recorded — trend appears after your next assessment.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', maxWidth: '100%' }}>
      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)',
            background: '#0f172a',
            color: '#fff',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            fontFamily: typography.fontFamily,
            pointerEvents: 'none',
            zIndex: 2,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 700 }}>
            {formatTrendValue(hovered.value, metric)}
            {unit ? ` ${unit}` : ''}
          </div>
          <div style={{ opacity: 0.85, marginTop: 2 }}>{formatScanHeadline(hovered.scannedAt)}</div>
          {hovered.deltaFromPrevious != null && (
            <div style={{ opacity: 0.75, marginTop: 2 }}>
              {hovered.deltaFromPrevious >= 0 ? '+' : ''}
              {Math.round(hovered.deltaFromPrevious * 10) / 10} vs prior
            </div>
          )}
          {metric.hasConfidence && hovered.confidenceLabel && hovered.confidenceLabel !== 'Unknown' && (
            <div
              style={{
                opacity: 0.9,
                marginTop: 4,
                color: isLowSdkConfidence(hovered.confidenceLabel) ? '#fde68a' : '#bbf7d0',
              }}
            >
              SDK confidence: {hovered.confidenceLabel}
            </div>
          )}
        </div>
      )}

      <div style={{ overflow: 'hidden', maxWidth: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={CHART_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridValues.map((val) => (
          <g key={val}>
            <line
              x1={PAD.l}
              y1={yPos(val)}
              x2={W - PAD.r}
              y2={yPos(val)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text
              x={PAD.l - 6}
              y={yPos(val) + 4}
              fontSize="9"
              fill="#94a3b8"
              textAnchor="end"
            >
              {val}
            </text>
          </g>
        ))}

        {areaPath && <path d={areaPath} fill={`url(#${CHART_GRADIENT_ID})`} />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {plotPoints.map((p, i) => {
          const ringColor = metric.hasConfidence
            ? trendConfidenceRingColor(p.confidenceLabel)
            : null;
          return (
          <g key={p.scanId}>
            <circle
              cx={p.x}
              cy={p.y}
              r="12"
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
            {ringColor && (
              <circle
                cx={p.x}
                cy={p.y}
                r={p.isLatest ? 8 : 7}
                fill="none"
                stroke={ringColor}
                strokeWidth="2"
                pointerEvents="none"
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={p.isLatest ? 5 : 4}
              fill={color}
              stroke="#fff"
              strokeWidth="2"
              pointerEvents="none"
            />
          </g>
          );
        })}

        {plotPoints.map((p, i) =>
          shouldShowXLabel(i, plotPoints.length) ? (
            <text
              key={`label-${p.scanId}`}
              x={p.x}
              y={H - 6}
              fontSize="10"
              fill={p.isLatest ? colors.slate900 : '#94a3b8'}
              fontWeight={p.isLatest ? 700 : 400}
              textAnchor="middle"
            >
              {p.xLabel}
            </text>
          ) : null,
        )}
      </svg>
      </div>
    </div>
  );
};

const MetricTrendsPanel: React.FC<MetricTrendsPanelProps> = ({
  scans,
  loading = false,
  isMobile = false,
}) => {
  const [metricId, setMetricId] = useState<TrendMetricId>(DEFAULT_TREND_METRIC);
  const [windowSize, setWindowSize] = useState<TrendWindow>(5);

  const series = useMemo(
    () => buildMetricTrendSeries(scans, metricId, windowSize),
    [scans, metricId, windowSize],
  );

  const { metric, stats, points, yMin, yMax } = series;
  const deltaDisplay =
    stats.change != null ? formatTrendDelta(stats.change, metric) : null;

  return (
    <section
      style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        padding: isMobile ? '20px 16px' : '24px 28px',
        fontFamily: typography.fontFamily,
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h3
          style={{
            fontSize: isMobile ? 20 : 22,
            fontWeight: 800,
            color: colors.slate900,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          Metric Trends
        </h3>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0', fontWeight: 500 }}>
          Historical performance across your recent assessments
        </p>
      </header>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20,
          width: '100%',
          minWidth: 0,
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flex: '1 1 120px',
            minWidth: 0,
            maxWidth: '100%',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
            Metric
          </span>
          <select
            value={metricId}
            onChange={(e) => setMetricId(e.target.value as TrendMetricId)}
            style={{
              appearance: 'none',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '5px 26px 5px 8px',
              fontSize: 12,
              fontWeight: 600,
              color: colors.slate900,
              background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 8px center`,
              cursor: 'pointer',
              fontFamily: typography.fontFamily,
              flex: 1,
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            {TREND_METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <div
          style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            borderRadius: 999,
            padding: 3,
            marginLeft: isMobile ? 0 : 'auto',
            flexShrink: 0,
          }}
          role="group"
          aria-label="Scan window"
        >
          {TREND_WINDOWS.map((w) => {
            const disabled = scans.length < 2 && w > 5;
            const insufficient = scans.length < w;
            const isActive = windowSize === w;

            return (
              <button
                key={w}
                type="button"
                disabled={disabled}
                onClick={() => setWindowSize(w)}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '6px 14px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontFamily: typography.fontFamily,
                  background: isActive ? '#fff' : 'transparent',
                  color: disabled ? '#cbd5e1' : isActive ? '#2563eb' : '#64748b',
                  boxShadow: isActive ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                  opacity: insufficient && !disabled && !isActive ? 0.65 : 1,
                }}
                title={
                  insufficient && !disabled
                    ? `Showing all ${scans.length} scan${scans.length === 1 ? '' : 's'}`
                    : undefined
                }
              >
                LAST {w}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div
          style={{
            height: 150,
            borderRadius: 12,
            background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.2s ease-in-out infinite',
          }}
        />
      ) : scans.length === 0 ? (
        <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', margin: '24px 0' }}>
          Complete your first scan to start tracking trends.
        </p>
      ) : (
        <>
          <TrendChart
            points={points}
            yMin={yMin}
            yMax={yMax}
            metric={metric}
          />

          {stats.validCount > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: 10,
                marginTop: 16,
              }}
            >
              {[
                {
                  label: 'Latest',
                  value: stats.latest != null ? formatTrendValue(stats.latest, metric) : '—',
                  unit: metric.unit,
                  accent: false,
                },
                {
                  label: 'Change',
                  value: deltaDisplay?.text ?? '—',
                  unit: '',
                  accent: true,
                  positive: deltaDisplay?.isPositive,
                },
                {
                  label: `Avg (${stats.validCount})`,
                  value: stats.average != null ? formatTrendValue(stats.average, metric) : '—',
                  unit: metric.unit,
                  accent: false,
                },
                {
                  label: 'Range',
                  value:
                    stats.min != null && stats.max != null
                      ? `${formatTrendValue(stats.min, metric)}–${formatTrendValue(stats.max, metric)}`
                      : '—',
                  unit: metric.unit,
                  accent: false,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: '#f8fafc',
                    borderRadius: 12,
                    padding: '12px 14px',
                    border: '1px solid #f1f5f9',
                    minWidth: 0,
                    overflow: 'hidden',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#94a3b8',
                    }}
                  >
                    {item.label}
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 18,
                      fontWeight: 800,
                      color:
                        item.accent && item.value !== '—'
                          ? item.positive
                            ? '#059669'
                            : item.positive === false
                              ? '#d97706'
                              : colors.slate900
                          : colors.slate900,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {item.value}
                    {item.unit && item.value !== '—' ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginLeft: 4 }}>
                        {item.unit}
                      </span>
                    ) : null}
                  </p>
                </div>
              ))}
            </div>
          )}

          {stats.validCount > 0 && stats.validCount < stats.totalInWindow && (
            <p style={{ margin: '12px 0 0', fontSize: 11, color: '#94a3b8' }}>
              Based on {stats.validCount} of {stats.totalInWindow} scans with {metric.label} data.
            </p>
          )}

          {metric.hasConfidence && stats.lowConfidenceCount > 0 && (
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 12,
                color: '#92400e',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 10,
                padding: '10px 12px',
                lineHeight: 1.5,
              }}
            >
              {stats.lowConfidenceCount} of {stats.validCount} point
              {stats.lowConfidenceCount === 1 ? '' : 's'} had Low or Medium SDK confidence
              (amber/red rings). Interpret trends with care — consider retaking those scans.
            </p>
          )}

          {metric.hasConfidence && stats.validCount > 0 && stats.lowConfidenceCount === 0 && (
            <p style={{ margin: '10px 0 0', fontSize: 11, color: '#64748b' }}>
              All plotted points reported High SDK confidence where available.
            </p>
          )}
        </>
      )}
    </section>
  );
};

export default MetricTrendsPanel;
