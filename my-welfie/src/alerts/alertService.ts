import rawAlerts from '../alerts.json';
import {
  AlertAction,
  AlertDefinition,
  AlertSeverity,
  ResolvedAlert,
} from './alertTypes';
import {
  LICENSE_USER_MESSAGE,
  UNKNOWN_ERROR,
  UNKNOWN_WARNING,
  USER_ALERT_COPY,
} from './userAlertCopy';

const ALERT_MAP = new Map<number, AlertDefinition>(
  (rawAlerts as AlertDefinition[]).map((a) => [a.code, a]),
);

const SUPPRESSED_WARNING_CODES = new Set([3506]);

function buildActions(
  severity: AlertSeverity,
  domain: string,
  code: number,
): AlertAction[] {
  if (severity === 'warning') {
    const actions: AlertAction[] = [];
    if (domain === 'MEASUREMENT' || code === 3505) {
      actions.push({ type: 'prepare_guide', label: 'Preparation guide' });
    }
    actions.push({ type: 'dismiss', label: 'Dismiss' });
    return actions;
  }

  // Errors
  const actions: AlertAction[] = [{ type: 'retry', label: 'Try again' }];

  if (domain === 'MEASUREMENT' || domain === 'CAMERA') {
    actions.push({ type: 'prepare_guide', label: 'Preparation guide' });
  }

  if (domain === 'INITIALIZATION' && (code === 7007 || code === 7008 || code === 7012)) {
    actions.push({ type: 'profile', label: 'Update profile' });
  } else if (domain === 'LICENSE' || domain === 'INITIALIZATION') {
    actions.push({ type: 'support', label: 'Contact support' });
  }

  actions.push({ type: 'dashboard', label: 'Dashboard' });
  return actions;
}

function fallbackMessage(def: AlertDefinition | undefined, domain: string): string {
  if (!def) return UNKNOWN_ERROR.message;
  if (domain === 'LICENSE') return LICENSE_USER_MESSAGE;

  const cause = def.cause.replace(/\s+/g, ' ').trim();
  if (cause.length <= 160) return cause;
  return `${cause.slice(0, 157)}…`;
}

function fallbackTitle(
  def: AlertDefinition | undefined,
  severity: AlertSeverity,
): string {
  if (severity === 'warning') return UNKNOWN_WARNING.title;
  return UNKNOWN_ERROR.title;
}

export function resolveAlert(
  code: number,
  severity: AlertSeverity,
): ResolvedAlert | null {
  if (code == null || code === -1) return null;

  const def = ALERT_MAP.get(code);
  const domain = def?.domain ?? 'UNKNOWN';
  const override = USER_ALERT_COPY[code];

  let title: string;
  let message: string;

  if (override) {
    title = override.title;
    message = override.message;
  } else if (domain === 'LICENSE') {
    title = severity === 'warning' ? 'Scan notice' : 'Scan unavailable';
    message = LICENSE_USER_MESSAGE;
  } else {
    title = fallbackTitle(def, severity);
    message = def
      ? fallbackMessage(def, domain)
      : severity === 'warning'
        ? UNKNOWN_WARNING.message
        : UNKNOWN_ERROR.message;
  }

  return {
    code,
    severity,
    domain,
    name: def?.name ?? 'UNKNOWN_ALERT',
    title,
    message,
    actions: buildActions(severity, domain, code),
    suppressDisplay: severity === 'warning' && SUPPRESSED_WARNING_CODES.has(code),
  };
}
