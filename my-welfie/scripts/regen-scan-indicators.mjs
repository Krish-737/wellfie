import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const src = execSync('git show HEAD:my-welfie/src/components/HealthIndicatorsPage.tsx', {
  cwd: path.resolve(root, '..'),
  encoding: 'utf8',
});

const lines = src.split(/\r?\n/);
const start = lines.findIndex((l) => l.includes('export interface ScanResult'));
const indStart = lines.findIndex((l) => l.includes('const INDICATORS'));
const end = lines.findIndex((l, i) => i > indStart && l.trim() === '];');

if (start < 0 || indStart < 0 || end < 0) {
  console.error('Failed to locate slice bounds', { start, indStart, end });
  process.exit(1);
}

let body = lines.slice(start, end + 1).join('\n');
body = body.replace(/^interface IndicatorDef/m, 'export interface IndicatorDef');
body = body.replace(
  /export interface IndicatorDef \{([^}]*?)  icon: string;\r?\n/m,
  'export interface IndicatorDef {$1',
);
body = body.replace(/const INDICATORS: IndicatorDef\[\] = \[/, 'export const INDICATORS: IndicatorDef[] = [');
body = body.replace(/, icon:'(?:\\'|[^'])*'/g, '');

const footer = `

export const INDICATOR_CATEGORIES = [
  { label:'Cardiovascular',   color:'#0f766e' },
  { label:'Respiratory',      color:'#0ea5e9' },
  { label:'HRV / Autonomic',  color:'#7c3aed' },
  { label:'Stress & Wellness',color:'#d97706' },
  { label:'Metabolic',        color:'#dc2626' },
  { label:'Risk Scores',      color:'#334155' },
] as const;

export const PRIMARY_INDICATOR_IDS = ['pulse', 'bp', 'spo2', 'stress_level'] as const;
export const WELLNESS_INDICATOR_ID = 'wellness';
export const MISSING_VALUE = '\u2014';

export function getIndicatorById(id: string): IndicatorDef | undefined {
  return INDICATORS.find((ind) => ind.id === id);
}

export function getIndicatorIndex(id: string): number {
  return INDICATORS.findIndex((ind) => ind.id === id);
}

export function getIndicatorsGroupedByCategory(): { category: string; color: string; items: IndicatorDef[] }[] {
  return INDICATOR_CATEGORIES.map(({ label, color }) => ({
    category: label,
    color,
    items: INDICATORS.filter((ind) => ind.category === label),
  }));
}
`;

const header = '/** Shared scan metric definitions — used by dashboard summary and health indicators. */\n\n';
const outPath = path.join(root, 'src/content/scanIndicators.ts');
fs.writeFileSync(outPath, header + body + footer, 'utf8');
console.log('Wrote', outPath, 'lines', end - start + 1);
