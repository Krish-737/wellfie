import { createLocalStorageStateHook } from 'use-local-storage-state';

export const DEFAULT_MEASUREMENT_DURATION = 50;
export const MIN_MEASUREMENT_DURATION = 20;
export const MAX_MEASUREMENT_DURATION = 180;

// The license key is injected at build time from the frontend .env file.
// localStorage can still override it (e.g. for development/testing).
const ENV_LICENSE_KEY: string = process.env.BIOSENSE_LICENSE_KEY || '';

export const useLicenseKey = createLocalStorageStateHook('licenseKey', ENV_LICENSE_KEY);
export const useProductId = createLocalStorageStateHook('productId', null);
export const useMeasurementDuration = createLocalStorageStateHook(
  'measurementDuration',
  DEFAULT_MEASUREMENT_DURATION,
);
