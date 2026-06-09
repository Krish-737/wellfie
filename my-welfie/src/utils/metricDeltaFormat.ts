export function formatDeltaValue(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  const abs = Math.abs(delta);
  if (abs >= 10) return `${sign}${Math.round(delta)}`;
  return `${sign}${Math.round(delta * 10) / 10}`;
}

export function formatCompactDelta(delta: number, unit: string, improved: boolean): string {
  const arrow = delta === 0 ? '→' : improved ? (delta > 0 ? '↗' : '↘') : (delta > 0 ? '↗' : '↘');
  const value = formatDeltaValue(delta);
  const suffix = unit ? ` ${unit}` : '';
  return `${arrow} ${value}${suffix}`;
}
