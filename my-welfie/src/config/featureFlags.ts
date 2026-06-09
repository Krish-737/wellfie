/**
 * Feature flags — toggle without code removal.
 *
 * CARDIO_FEATURED_CONTEXT_V2: Cardiovascular featured cards show target range +
 * delta vs last scan instead of sparkline bars. Set to false to revert to bars.
 */
export const CARDIO_FEATURED_CONTEXT_V2 = true;

/** Cardiovascular indicator ids affected when CARDIO_FEATURED_CONTEXT_V2 is on. */
export const CARDIO_CONTEXT_INDICATOR_IDS = new Set([
  'pulse',
  'bp',
  'heart_age',
  'pulse_pressure',
  'map',
  'cardiac_workload',
]);

export function useCardiovascularContextV2(indicatorId: string, category: string): boolean {
  return (
    CARDIO_FEATURED_CONTEXT_V2 &&
    category === 'Cardiovascular' &&
    CARDIO_CONTEXT_INDICATOR_IDS.has(indicatorId)
  );
}

/**
 * RECOVERY_FEATURED_CONTEXT_V2: Recovery (HRV) featured cards for SDNN, RMSSD,
 * Mean RRI, and PRQ show target range + delta instead of sparkline bars.
 * Set to false to revert to bars.
 */
export const RECOVERY_FEATURED_CONTEXT_V2 = true;

export const RECOVERY_CONTEXT_INDICATOR_IDS = new Set([
  'sdnn',
  'rmssd',
  'mean_rri',
  'prq',
]);

export function useRecoveryContextV2(indicatorId: string, category: string): boolean {
  return (
    RECOVERY_FEATURED_CONTEXT_V2 &&
    category === 'HRV / Autonomic' &&
    RECOVERY_CONTEXT_INDICATOR_IDS.has(indicatorId)
  );
}
