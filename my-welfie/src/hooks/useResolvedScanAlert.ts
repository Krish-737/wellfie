import { useCallback, useEffect, useState } from 'react';
import { AlertData } from '@biosensesignal/web-sdk';
import { resolveAlert } from '../alerts/alertService';
import { ResolvedAlert } from '../alerts/alertTypes';

const WARNING_DISMISS_MS = 6000;

const useResolvedScanAlert = (
  error: AlertData,
  warning: AlertData,
) => {
  const [scanError, setScanError] = useState<ResolvedAlert | null>(null);
  const [scanWarning, setScanWarning] = useState<ResolvedAlert | null>(null);

  useEffect(() => {
    if (error?.code == null || error.code === -1) {
      setScanError(null);
      return;
    }
    setScanError(resolveAlert(error.code, 'error'));
  }, [error?.code]);

  useEffect(() => {
    if (warning?.code == null || warning.code === -1) {
      setScanWarning(null);
      return;
    }
    const resolved = resolveAlert(warning.code, 'warning');
    if (!resolved || resolved.suppressDisplay) {
      setScanWarning(null);
      return;
    }
    setScanWarning(resolved);
    const timer = window.setTimeout(() => setScanWarning(null), WARNING_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [warning?.code]);

  const clearScanWarning = useCallback(() => setScanWarning(null), []);

  return { scanError, scanWarning, clearScanWarning };
};

export default useResolvedScanAlert;
