# Important Vital Guide

Internal reference for My Wellfie scan metrics: how BioSense SDK vitals should be stored, displayed in the app, and rendered in PDF reports.

**Strategy:** Do **not** custom-normalize SDK values. Use an **SDK-faithful display layer** — official enums, confidence levels, measurement duration context, and disclaimers from Binah/BioSense documentation.

---

## Official SDK references

| Resource | URL |
|----------|-----|
| Indicators Technical Information | https://developer.biosensesignal.com/web/latest/general/indicators-technical-information.html |
| Confidence Level | https://developer.biosensesignal.com/web/latest/general/indicators-technical-information.html#confidence-level |
| Target Accuracy | https://developer.biosensesignal.com/web/latest/general/accuracy-targets.html |
| Vital Signs & Health Indicators (PDF) | https://documents.biosensesignal.com/docs/Vital%20Signs%20and%20Health%20Indicators%20Information.pdf |

---

## What the SDK defines

### Per-indicator timing and availability

From the [indicators table](https://developer.biosensesignal.com/web/latest/general/indicators-technical-information.html):

| Pattern | Examples | Implication |
|---------|----------|-------------|
| **Runtime + final** | Pulse (8s runtime, **20s** final), Resp rate (23s / **35s**) | Short scans can show live pulse but miss final-only metrics |
| **Final report only** | BP, SDNN, wellness, risks, metabolic, most HRV | `null` in DB often means **duration/license**, not “user is unhealthy” |
| **Longer HRV window** | LF/HF, PNS/SNS, RRi, SD1/SD2 need **50s** | 35–40s scans systematically miss these |
| **Platform-limited** | BP, Hb, HbA1c, several risks — **Android + iOS 17+ only** | **Web** users will often have gaps — must explain in UI/PDF |
| **Under research** | Hemoglobin, HbA1c (marked *) | Extra disclaimer required in app + reports |

### Confidence level

[Confidence Level](https://developer.biosensesignal.com/web/latest/general/indicators-technical-information.html#confidence-level):

- Values: **Low**, **Medium**, **High**
- Not reported for all indicators (BP, wellness, risks, stress enums, etc. have **no** confidence in the SDK table)
- SDK guidance: **if any reported confidence is not High → retake scan**

**Numeric mapping in SDK payloads** (see `my-welfie/REMAINDER/vitals.md`):

| `confidenceLevel` | Label |
|-------------------|-------|
| 3 | High |
| 2 | Medium |
| 1 | Low |
| 0 | Unknown |

**Today:** `_map_vitals()` in `my-welfie-backend/app/routers/results.py` extracts **`.value` only** — confidence is discarded at ingest.

### Accuracy / valid measurement ranges

[Target Accuracy](https://developer.biosensesignal.com/web/latest/general/accuracy-targets.html):

| Indicator | Range | Unit | Resolution | Estimated error |
|-----------|-------|------|------------|-----------------|
| Pulse Rate | 48–180 | bpm | 1 | MAE ≤ 3 |
| Respiration Rate | 8–30 | brpm | 1 | MAE ≤ 3 |
| Mean RRi | 420–1400 | ms | 1 | MAE ≤ 25 |
| BP Systolic | 90–160 | mmHg | 1 | MAE ≤ 15 |
| BP Diastolic | 50–100 | mmHg | 1 | MAE ≤ 10 |
| Hemoglobin | 9–17 | g/dL | 0.1 | MAE ≤ 1.5 |
| Hemoglobin A1C | 4–8 | % | 0.01 | MAE ≤ 1.1 |

These are **SDK-valid ranges + error bounds**, not the same as clinical “normal” bands (e.g. pulse 60–100) used in `scanIndicators.ts` and `report_pdf.py`.

### SDK-native composite fields (prefer over custom scaling)

| DB column | SDK field | Purpose |
|-----------|-----------|---------|
| `wellness_index` | `wellnessIndex.value` | Numeric wellness score — **show as SDK returns** |
| `wellness_level` | `wellnessLevel.value` | Enum: 0=Unknown, 1=Low, 2=Normal, 3=High |
| `stress_index` | `stressIndex.value` | Raw Baevsky index |
| `normalized_stress_index` | `normalizedStressIndex.value` | **SDK 0–100** — use for cross-session stress comparison |
| `stress_level` | `stressLevel.value` | Enum: 0=Unknown … 5=Extreme |

**Do not use** custom `normalizeWellnessIndex()` for display if following this guide. Pair **`wellness_index` + `wellness_level`** for vitality UI and reports.

---

## Current architecture (gaps)

```
SDK payload (value + confidenceLevel + enabled flags)
        ↓
_map_vitals()  →  only .value  →  scan_results (34 floats/enums)
        ↓
UI: scanIndicators.ts (custom thresholds + wellness normalize)
PDF: report_pdf.py (duplicate enums + wellness normalize)
```

### Missing from persistence

- `confidenceLevel` per vital
- `isEnabled*` flags from license/session
- Actual `measurement_duration_sec`
- Platform / SDK version
- Alerts/warnings during scan

### Missing from product logic

- Distinction between: *unsupported platform* vs *scan too short* vs *low confidence* vs *not in license*

### Known inconsistencies

| Area | UI | PDF |
|------|----|-----|
| Wellness target | `> 70 / 100` (normalized) | `>60 / 100` (normalized) |
| Wellness value | `normalizeWellnessIndex()` | `_normalize_wellness_index()` (duplicated Python) |
| Scan confidence | `computeScanConfidence()` counts populated fields (unused) | Generic “signal confidence” note — not per-metric SDK confidence |
| `normalized_stress_index` | Stored in DB, **not in `INDICATORS`** | Listed in PDF |
| Scan duration | Timer uses license `processingTime`; not stored on result | Hardcoded “40 s duration” |

---

## Codebase map

| Layer | Location |
|-------|----------|
| SDK → DB ingest | `my-welfie-backend/app/routers/results.py` → `_map_vitals()` |
| DB model | `my-welfie-backend/app/models/scan_result.py` |
| UI indicator registry | `my-welfie/src/content/scanIndicators.ts` |
| Wellness normalization (legacy) | `my-welfie/src/utils/wellnessScore.ts` |
| Homemade scan confidence (legacy) | `my-welfie/src/utils/wellnessInsights.ts` → `computeScanConfidence()` |
| Live scan + save | `my-welfie/src/hooks/useMonitor.ts` |
| Missing-value / completeness (P1) | `my-welfie/src/utils/metricAvailability.ts` |
| Shared metric spec (P2) | `shared/metricSpec.json` · `my-welfie/src/content/metricSpec.ts` · `my-welfie-backend/app/services/metric_spec.py` |
| Post-scan quality banner (P1) | `my-welfie/src/components/dashboard/ScanQualityBanner.tsx` |
| PDF report | `my-welfie-backend/app/services/report_pdf.py` |
| Post-scan modal | `my-welfie/src/components/ReportModal.tsx` |
| Trends | `my-welfie/src/utils/metricTrend.ts` |
| Mock payload shape | `my-welfie/REMAINDER/vitals.md` |
| Backend field mapping | `my-welfie-backend/dev-docs/scan.md` |

---

## Target architecture (SDK fidelity layer)

```
┌─────────────────────────────────────────────────────────┐
│  BioSense SDK (source of truth for values & confidence) │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────▼─────────────────┐
         │  Ingest: values + confidence +   │
         │  enabled + duration + warnings   │
         └─────────────────┬─────────────────┘
                           │
         ┌─────────────────▼─────────────────┐
         │  metricSpec (shared JSON/YAML)       │
         │  - sdkField, unit, enumMap           │
         │  - hasConfidence, minDurationSec   │
         │  - platformSupport, researchFlag     │
         │  - displayFormat (no scale math)   │
         └─────────┬───────────────┬─────────┘
                   │               │
            ┌──────▼──────┐ ┌──────▼──────┐
            │  Dashboard  │ │  PDF report │
            │  scanIndic. │ │  report_pdf │
            └─────────────┘ └─────────────┘
                   │
            ┌──────▼──────┐
            │ My Wellfie  │  ← optional lifestyle copy only
            │ insights    │     (not alternate numbers)
            └─────────────┘
```

### Display rules (no custom normalization)

1. **Never change SDK numeric values** for display — only format (decimals, units).
2. **Prefer SDK composite enums** (`wellness_level`, `stress_level`, risk enums) for status color.
3. **Prefer SDK normalized fields** where provided (`normalized_stress_index` for trends).
4. **Use SDK confidence** when present; do not invent a % completeness score.
5. **Clinical “normal ranges”** = secondary interpretation, labeled as such — separate from SDK accuracy ranges.

---

## App improvements

### A. Ingest and API (highest priority)

Extend save payload / DB to store metadata alongside values:

```json
{
  "pulse_rate": 72,
  "pulse_rate_confidence": 3,
  "pulse_rate_enabled": true,
  "measurement_duration_sec": 38,
  "platform": "web",
  "sdk_version": "5.11.4",
  "scan_warnings": []
}
```

Update `_map_vitals()` to extract `confidenceLevel` from each `{ "value", "confidenceLevel" }` object.

### B. Replace homemade scan confidence

Remove reliance on `computeScanConfidence()` (counts how many indicators have values — **not** SDK confidence).

**Replace with:**

1. **Per-metric confidence badge** (High / Medium / Low) where SDK provides it.
2. **Scan-level banner:** if any core vital with confidence ≠ High → *“Retake scan — see BioSense best practices.”*

Indicators with SDK confidence (see technical info table): pulse, resp rate, SDNN, RMSSD, cardiac workload, heart age, MAP, pulse pressure, PRQ, mean RRi, RRi, and others marked “Yes” in the table.

### C. Vitality / wellness hero

| Element | SDK-faithful approach |
|---------|----------------------|
| Primary number | `wellness_index` as SDK returns it |
| Primary label | `WELLNESS_MAP[wellness_level]` — Normal, High, etc. |
| Ring / progress | Only if max scale is documented for your SDK build — do not infer 0–100 |
| Status pill | From **`wellness_level` enum**, not custom 80/70/40 cutoffs |

**Remove or gate:** `normalizeWellnessIndex`, `formatWellnessDisplay` “/ 100”, vitality ring filled from normalized %.

### D. `scanIndicators.ts` alignment

| Area | Fix |
|------|-----|
| Wellness | Raw index + level; targets from Vital Signs PDF / SDK |
| Stress | Add **Normalized Stress Index** indicator; use for trends |
| Wellness level | Dedicated row or hero sub-label |
| Thresholds | Split SDK valid range vs lifestyle interpretation |
| Missing values | Show reason: Web unsupported / needs ≥35s / not licensed / low confidence |
| Metabolic | Mark **“Research — not diagnostic”** per SDK * |

### E. Measurement duration UX

| SDK requirement | Seconds |
|-----------------|---------|
| Wellness final | 20 |
| Most finals (BP, SDNN, stress, etc.) | 35 |
| LF/HF, PNS/SNS, RRi, SD1/SD2 | 50 |

- Persist **actual scan duration** on save.
- Post-scan **completeness panel** (e.g. ✓ Pulse 20s met, ✗ LF/HF needs 50s).

### F. Platform and license transparency

- State on Web: BP / Hb / HbA1c / several risks may be unavailable.
- Persist `enabledVitalSigns` from `useMonitor.ts` so UI does not show empty cards for disabled license features.

### G. Trends (`metricTrend.ts`)

| Metric | Use |
|--------|-----|
| Vitality | Raw `wellness_index` (not `normalizeWellnessIndex`) |
| Stress trends | **`normalized_stress_index`** |
| Chart points | Annotate when confidence was Low/Medium |

### H. Live scan UI

- Align `ReportModal` with dashboard indicator registry.
- Show confidence on live stats where SDK streams them.
- Distinguish `isEnabled: false` vs value missing.

---

## Report improvements (`report_pdf.py`)

1. **Stop wellness normalization** — raw `wellness_index` + `wellness_level` label; remove `_normalize_wellness_index`.
2. **Add Confidence column** where SDK supports it (blank for indicators marked “-” in SDK table).
3. **Align targets** with SDK docs and Vital Signs PDF; fix UI/PDF wellness target mismatch.
4. **Replace hardcoded “40 s duration”** with stored actual duration + required duration notes per section.
5. **Structured disclaimers:** wellness only; SDK confidence policy; research indicators (*); Web platform limits; missing `—` reasons.
6. **Promote Normalised Stress Index** in UI to match PDF.
7. **ASCVD / risks:** show score + level; note 35s final + health profile required.

---

## Indicators with confidence (SDK table)

Use this when implementing per-metric confidence badges:

| Has confidence | Indicators |
|----------------|------------|
| **Yes** | Cardiac Workload, Respiration Rate, Heart Age, Mean Arterial Pressure, Mean RRi, Pulse Pressure, Pulse Rate, PRQ, RMSSD, RRi, SDNN |
| **No** | ASCVD, BP, metabolic, risks, LF/HF, PNS/SNS zones, stress enums, wellness, normalized stress, SD1/SD2, etc. |

Full table: [Indicators Technical Information](https://developer.biosensesignal.com/web/latest/general/indicators-technical-information.html).

---

## Phased roadmap

> **P0 implemented (May 2026):** SDK metadata persisted on save (`vitals_confidence`, `vitals_enabled`, `measurement_duration_sec`, `scan_platform`); wellness display uses raw `wellness_index` + `wellness_level` (no custom 0–100 normalization in UI/PDF/trends).

> **P1 implemented (May 2026):** Normalized Stress Index + Wellness Level indicators; missing-value reasons on metric cards; post-scan SDK confidence retake banner + scan completeness panel (`ScanQualityBanner`, `metricAvailability.ts`); stress trends use `normalized_stress_index`.

> **P2 implemented (May 2026):** Shared `shared/metricSpec.json` drives availability metadata (UI) and PDF confidence/missing-reason/disclaimer logic; research (*) and mobile-only badges on metric cards; PDF adds CONF. column and structured compliance notes.

> **P3 implemented (May 2026):** Trend chart points show SDK confidence (amber/red rings + tooltip); trend metrics use `metricSpec.hasConfidence`; live scan stats show confidence labels; post-scan `ReportModal` aligned with dashboard (normalized stress, wellness level, research *).

| Phase | Work | Outcome |
|-------|------|---------|
| **P0** | Persist confidence + duration + enabled flags; remove wellness normalize in hero/PDF/trends | UI matches SDK numbers |
| **P1** | Add normalized stress + wellness level indicators; missing-value reasons | Clearer empty states |
| **P1** | Post-scan completeness + confidence banner | Users know when to rescan |
| **P2** | Shared `metricSpec` from SDK docs + Vital Signs PDF | UI/PDF parity |
| **P2** | Platform/research disclaimers on cards + PDF | Compliance-aligned |
| **P3** | Trends on SDK-comparable fields; confidence on chart points | Trustworthy history |

---

## Remove or refactor (no normalization policy)

| Legacy | Replace with |
|--------|--------------|
| `normalizeWellnessIndex` in UI, PDF, trends, insights | Raw `wellness_index` + `wellness_level` |
| Vitality ring 0–100 from normalized score | Level enum and/or raw index per documented scale |
| `computeScanConfidence()` field-count heuristic | SDK confidence aggregation |
| Custom wellness thresholds (70/40) in copy | `wellness_level` + SDK/PDF targets |
| Treating `null` as poor health | `null` = incomplete or unavailable scan |

---

## Full 34-field SDK → DB mapping

See `my-welfie-backend/dev-docs/scan.md` for the complete camelCase → column table.

Core enum maps (shared conceptually with `scanIndicators.ts` and `report_pdf.py`):

| Field | Enum values |
|-------|-------------|
| `stress_level` | 0=Unknown, 1=Very Low, 2=Low, 3=Normal, 4=High, 5=Extreme |
| `pns_zone` / `sns_zone` | 0=Unknown, 1=Low, 2=Normal, 3=High |
| `wellness_level` | 0=Unknown, 1=Low, 2=Normal, 3=High |
| Risk fields | 0=Unknown, 1=Low, 2=Medium, 3=High |

---

## Health profile dependency

Risk scores and several indicators depend on user demographics (sex, DOB, height, weight, smoking). Ensure health profile is complete before scan; gate messaging lives in `userProfile.ts` and `HealthProfilePage.tsx`.

---

*Last updated: May 2026 — align implementation with this guide before changing thresholds, wellness display, or PDF rows.*
