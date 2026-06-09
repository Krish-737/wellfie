/** Unit conversion helpers — API/SDK always use cm and kg. */

export type UnitSystem = 'metric' | 'imperial';

export const UNITS_STORAGE_KEY = 'mywellfie_units';

const CM_PER_INCH = 2.54;
const LB_PER_KG = 2.2046226218;

import {
  SDK_HEIGHT_CM_MIN,
  SDK_HEIGHT_CM_MAX,
  SDK_WEIGHT_KG_MIN,
  SDK_WEIGHT_KG_MAX,
} from './userProfile';

export const HEIGHT_CM_MIN = SDK_HEIGHT_CM_MIN;
export const HEIGHT_CM_MAX = SDK_HEIGHT_CM_MAX;
export const WEIGHT_KG_MIN = SDK_WEIGHT_KG_MIN;
export const WEIGHT_KG_MAX = SDK_WEIGHT_KG_MAX;

export function ftInToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return Math.round(totalInches * CM_PER_INCH * 10) / 10;
}

export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalInches = cm / CM_PER_INCH;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - feet * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

export function lbToKg(lb: number): number {
  return Math.round((lb / LB_PER_KG) * 10) / 10;
}

export function kgToLb(kg: number): number {
  return Math.round(kg * LB_PER_KG * 10) / 10;
}

export const WEIGHT_LB_MIN = Math.ceil(kgToLb(WEIGHT_KG_MIN));
export const WEIGHT_LB_MAX = Math.floor(kgToLb(WEIGHT_KG_MAX));

export function formatHeightCmHint(cm: number): string {
  const { feet, inches } = cmToFtIn(cm);
  return `≈ ${feet}′${inches}″`;
}

export function formatWeightKgHint(kg: number): string {
  return `≈ ${kgToLb(kg)} lb`;
}

export function loadUnitPreference(): UnitSystem {
  try {
    const v = localStorage.getItem(UNITS_STORAGE_KEY);
    if (v === 'imperial' || v === 'metric') return v;
  } catch {
    /* ignore */
  }
  return 'metric';
}

export function saveUnitPreference(system: UnitSystem): void {
  try {
    localStorage.setItem(UNITS_STORAGE_KEY, system);
  } catch {
    /* ignore */
  }
}
