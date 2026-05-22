# My Wellfie — Scan Metrics Reminder

## Full Metric List (34 Indicators)

| Category | Key Metrics Received |
| :--- | :--- |
| **Foundation** | Pulse Rate (HR), Respiration Rate (RR), Oxygen Saturation (SpO2) |
| **Cardio** | Blood Pressure (Systolic/Diastolic), Heart Age, Cardiac Workload, Mean Arterial Pressure |
| **HRV (Nervous System)** | SDNN, RMSSD, PRQ, PNS Index/Zone, SNS Index/Zone, LF/HF Ratio |
| **Metabolic (Blood)** | **HbA1c (Diabetes marker)**, **Hemoglobin**, Glucose Risk, Cholesterol Risk |
| **Stress & Mind** | Stress Level (Enum), Stress Index (0-100), Wellness Score |
| **Risk Scoring** | ASCVD (Stroke/Heart Attack Risk), High BP Risk, HbA1c Risk |

## Mock Data Example (JSON)
Use this to test your backend storage or frontend display:

```json
{
  "scannedAt": "2024-05-07T00:42:00Z",
  "vitals": {
    "pulseRate": { "value": 72, "confidenceLevel": 3 },
    "respirationRate": { "value": 16, "confidenceLevel": 3 },
    "oxygenSaturation": { "value": 98, "confidenceLevel": 2 },
    "bloodPressure": { 
      "value": { "systolic": 118, "diastolic": 76 },
      "confidenceLevel": 2 
    },
    "sdnn": { "value": 45.2, "confidenceLevel": 3 },
    "stressLevel": { "value": 2 }, 
    "stressIndex": { "value": 34.5 },
    "wellnessIndex": { "value": 88.0 },
    "hemoglobinA1c": { "value": 5.4 },
    "hemoglobin": { "value": 14.2 },
    "heartAge": { "value": 32.0 },
    "highFastingGlucoseRisk": { "value": 1 }, 
    "highTotalCholesterolRisk": { "value": 1 },
    "ascvdRisk": { "value": 2.1 }
  }
}
```

## Important Notes
- **Confidence Levels:** 3=High, 2=Medium, 1=Low, 0=Unknown.
- **Requirements:** 
    - 60-second scan for high accuracy.
    - Good lighting (no shadows on face).
    - User Demographics (Age/Sex/Height/Weight) required for Risk Scores.
- **Backend Sync:** All these fields are already mapped in your `my-welfie-backend/app/models/scan_result.py` file.
