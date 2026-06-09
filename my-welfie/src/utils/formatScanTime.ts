/** Ensures backend timestamps without timezone info are treated as UTC. */
export function toUtcDate(iso: string): Date {
  return new Date(iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`);
}

export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - toUtcDate(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function shortDate(iso?: string): string {
  if (!iso) return '--';
  return toUtcDate(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function shortTime(iso?: string): string {
  if (!iso) return '';
  return toUtcDate(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatScanTimestamp(iso?: string): string {
  if (!iso) return '—';
  const date = toUtcDate(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scanDay = new Date(date);
  scanDay.setHours(0, 0, 0, 0);
  const dayLabel = scanDay.getTime() === today.getTime()
    ? 'Today'
    : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${dayLabel} · ${shortTime(iso)}`;
}

/** Headline for latest-scan card, e.g. "Today, 08:42 AM". */
export function formatScanHeadline(iso?: string): string {
  if (!iso) return '—';
  const date = toUtcDate(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const scanDay = new Date(date);
  scanDay.setHours(0, 0, 0, 0);

  let dayLabel: string;
  if (scanDay.getTime() === today.getTime()) {
    dayLabel = 'Today';
  } else if (scanDay.getTime() === yesterday.getTime()) {
    dayLabel = 'Yesterday';
  } else {
    dayLabel = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  return `${dayLabel}, ${shortTime(iso)}`;
}
