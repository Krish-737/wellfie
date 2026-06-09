export const SCAN_PREP_TITLE = 'Prepare for Your Scan';
export const SCAN_PREP_SUBTITLE =
  'Follow these steps for the most accurate wellness reading. Takes about 30 seconds to review.';

export const SCAN_PREP_QUICK_CHECKLIST: string[] = [
  'Wait at least 3 minutes between scans (helps prevent device overheating).',
  'Place your phone on a stand about 30 cm (12 in.) from your face, camera at eye level.',
  'Sit still with feet flat on the floor and your face fully visible — no hair, masks, or sunglasses.',
  'Use even lighting on your face; avoid backlight and direct sunlight.',
  'Stay quiet and focused on the screen until the scan finishes.',
];

export interface ScanPrepSection {
  id: string;
  title: string;
  items: string[];
}

export const SCAN_PREP_SECTIONS: ScanPrepSection[] = [
  {
    id: 'before',
    title: 'Before you begin',
    items: [
      'Wait at least 3 minutes between scans. Back-to-back scans can heat up your device and affect accuracy.',
      'Keep battery above 20% and turn off power-saving mode if possible.',
      'Clean your front camera lens — fingerprints and smudges blur the scan.',
      'Use a phone stand or stable surface to reduce hand shake.',
    ],
  },
  {
    id: 'position',
    title: 'Position your phone',
    items: [
      'Place the device about 30 cm (12 inches) from your face.',
      'Hold the front camera at eye level, parallel to your face — not angled up or down.',
      'Keep the phone steady for the full scan; a stand works best.',
    ],
  },
  {
    id: 'posture',
    title: 'Your posture & face',
    items: [
      'Sit upright with feet flat on the floor and legs uncrossed.',
      'Keep your face fully in frame — pull hair back and remove hats, masks, and sunglasses.',
      'Stay still, avoid talking, and look at the screen until the scan completes.',
    ],
  },
  {
    id: 'lighting',
    title: 'Lighting & surroundings',
    items: [
      'Light your face evenly — avoid harsh shadows on one side.',
      'Prefer one main light source in front of you rather than multiple competing lights.',
      'Sit so no bright light shines directly into the camera (e.g. with your back to a wall).',
      'Avoid direct sunlight on your face or in the camera view.',
      'Minimize movement from other people in the background.',
      'Avoid mirrors, glass, and shiny surfaces behind you — they can interfere with the scan.',
      'Aim for good ambient light (roughly 400 lux or brighter — a well-lit room is usually enough).',
      'Neutral or cool white light (>4500K) works better than colored or very warm bulbs.',
    ],
  },
];

export const SCAN_PREP_DISCLAIMER =
  'These tips help improve scan quality. Results are wellness indicators, not a medical diagnosis. Consult a healthcare professional for clinical concerns.';
