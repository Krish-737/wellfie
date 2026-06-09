"""
My Wellfie — Health Scan PDF Report Generator  v4.0
=====================================================
Single-session A4 PDF aligned to Important-Vital-Guide.md and metricSpec.json.

Layout (4 columns per section)
------------------------------
  INDICATOR | YOUR RESULT (value + status + confidence) | TARGET RANGE | INDICATOR EXPLANATION

Design rules
------------
  • Teal (#0f766e) brand colour throughout
  • Raw SDK wellness_index + wellness_level (no normalization)
  • normalized_stress_index for stress section
  • Targets from metricSpec.targetDisplay
  • Missing values as — (reason) via pdf_missing_reason()
  • SDK confidence sub-line under YOUR RESULT when hasConfidence is true
  • Structured compliance notes via structured_disclaimer_notes()
"""

from __future__ import annotations

import io
import os
from datetime import datetime
from pathlib import Path
from typing import Any, List, Optional, Tuple

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph

from app.services.metric_spec import (
    get_metric_by_id,
    metrics_for_pdf_section,
    pdf_confidence_for_key,
    pdf_metric_label,
    pdf_missing_reason,
    structured_disclaimer_notes,
)

# ── Palette ────────────────────────────────────────────────────────────────────
TEAL        = colors.HexColor("#0f766e")
TEAL_LIGHT  = colors.HexColor("#ccfbf1")
SLATE_900   = colors.HexColor("#0f172a")
SLATE_700   = colors.HexColor("#334155")
SLATE_500   = colors.HexColor("#64748b")
SLATE_200   = colors.HexColor("#e2e8f0")
SLATE_100   = colors.HexColor("#f1f5f9")
WHITE       = colors.white
GREEN       = colors.HexColor("#16a34a")
GREEN_BG    = colors.HexColor("#dcfce7")
AMBER       = colors.HexColor("#b45309")
AMBER_BG    = colors.HexColor("#fef3c7")
RED         = colors.HexColor("#dc2626")
RED_BG      = colors.HexColor("#fee2e2")
GREY_BG     = colors.HexColor("#f1f5f9")

# ── Page geometry ──────────────────────────────────────────────────────────────
W, H        = A4
ML          = 18 * mm
MR          = 18 * mm
CW          = W - ML - MR
HEADER_H    = 44 * mm
FOOTER_H    = 16 * mm
TOP_Y       = H - HEADER_H

W_IND       = 34 * mm
W_RESULT    = 30 * mm
W_TARGET    = 28 * mm
W_EXPLAIN   = CW - W_IND - W_RESULT - W_TARGET

COL_IND     = ML
COL_RES     = ML + W_IND
COL_TGT     = ML + W_IND + W_RESULT
COL_EXP     = ML + W_IND + W_RESULT + W_TARGET

# ── Enum label maps ────────────────────────────────────────────────────────────
RISK_LABEL     = {None: "—", 0: "Unknown", 1: "Low", 2: "Medium", 3: "High"}
ZONE_LABEL     = {None: "—", 0: "Unknown", 1: "Low",  2: "Normal", 3: "High"}
STRESS_LABEL   = {None: "—", 0: "Unknown", 1: "Very Low", 2: "Low",
                  3: "Normal", 4: "High",  5: "Extreme"}
WELLNESS_LABEL = {None: "—", 0: "Unknown", 1: "Low", 2: "Normal", 3: "High"}

_GOOD  = {"Low", "Very Low", "Normal", "Optimal", "Healthy", "Good"}
_WATCH = {"Medium", "Moderate", "Elevated", "High (Stress)", "Low (HRV)", "Unknown"}
_BAD   = {"High", "Extreme", "Critical"}


def _resolve_logo_path(explicit: Optional[str] = None) -> str:
    if explicit and os.path.exists(explicit):
        return explicit
    env = os.environ.get("REPORT_LOGO_PATH")
    if env and os.path.exists(env):
        return env
    here = Path(__file__).resolve().parent
    for candidate in (
        here / "mywellfie-header-logo.png",
        here / "assets" / "mywellfie-header-logo.png",
        here.parents[2] / "my-welfie" / "src" / "assets" / "mywellfie-header-logo.png",
    ):
        if candidate.exists():
            return str(candidate)
    return ""


DEFAULT_LOGO_PATH = _resolve_logo_path()

# ── PDF section order (single session, no trends) ─────────────────────────────
PDF_SECTIONS: List[Tuple[str, str]] = [
    ("1 · Cardiovascular", "cardiovascular"),
    ("2 · Respiratory", "respiratory"),
    ("3 · HRV & Autonomic Nervous System", "hrv"),
    ("4 · Stress & Wellness", "stress_wellness"),
    ("5 · Metabolic & Bloodless Biomarkers", "metabolic"),
    ("6 · Cardio-Metabolic Risk Scores", "risk"),
    ("7 · ASCVD 10-Year Cardiovascular Risk", "ascvd"),
]

# Rows not fully represented in metricSpec.json (virtual metric ids)
PDF_ROW_OVERRIDES: dict[str, List[str]] = {
    "risk": ["bp_risk", "hba1c_risk", "glucose_risk", "cholesterol_risk", "low_hemoglobin_risk"],
    "ascvd": ["ascvd", "ascvd_level"],
}

PDF_LABEL_OVERRIDES: dict[str, str] = {
    "hba1c_risk": "High HbA1c Risk",
    "low_hemoglobin_risk": "Low Haemoglobin Risk",
    "ascvd_level": "ASCVD Risk Level",
}

PDF_DESCRIPTIONS: dict[str, str] = {
    "pulse": "Resting heart beats per minute. Normal adults: 60–100 bpm.",
    "bp": "Systolic (contraction) / Diastolic (rest) pressure. Stage 1 hypertension: ≥130/80.",
    "pulse_pressure": "Difference between systolic and diastolic. Elevated values suggest arterial stiffness.",
    "map": "Average perfusion pressure across one cardiac cycle. Critical for organ blood flow.",
    "cardiac_workload": "Approximates myocardial oxygen demand (Rate-Pressure Product proxy).",
    "heart_age": "Framingham model estimate of vascular age vs. chronological age.",
    "resp_rate": "Respiratory cycles per minute at rest. Elevated rate may indicate stress or illness.",
    "spo2": "Percentage of haemoglobin carrying oxygen. Below 95% warrants clinical attention.",
    "sdnn": "Standard deviation of NN intervals — overall HRV. Low SDNN linked to cardiovascular risk.",
    "rmssd": "Root mean square of successive RR differences — reflects parasympathetic (vagal) tone.",
    "mean_rri": "Average R-R (inter-beat) interval. Longer values imply stronger parasympathetic activity.",
    "lfhf": "Ratio of low-frequency to high-frequency HRV power — sympatho-vagal balance index.",
    "prq": "Pulse-Respiration Quotient — efficiency of heart-lung coordination.",
    "pns": "Parasympathetic nervous system activity. Higher = more rest-and-digest tone.",
    "sns": "Sympathetic nervous system activity. Elevated = fight-or-flight dominance.",
    "stress_level": "Baevsky Stress Index classification. Reflects how the ANS handles homeostatic load.",
    "stress_index": "Non-negative mathematical index of sympathetic nervous system dominance.",
    "normalized_stress_index": "Stress Index scaled to 0–100 for cross-session comparison.",
    "wellness_level": "Overall cardiovascular wellness classification derived from combined vital signals.",
    "wellness": "Numeric wellness score (Binah model) predicting 5–10 year cardiovascular risk. Displayed as returned by the SDK.",
    "hba1c": "3-month average blood glucose proxy. Pre-diabetes: 5.7–6.4%. Diabetes: ≥6.5%.",
    "hemoglobin": "Blood haemoglobin concentration. Low levels indicate anaemia risk.",
    "bp_risk": "Probability that systolic/diastolic readings exceed clinical hypertension threshold.",
    "hba1c_risk": "Risk that HbA1c level exceeds 5.7% — early indicator of insulin resistance.",
    "glucose_risk": "Risk of impaired fasting glucose (≥100 mg/dL). Disregard if not fasting ≥8 hrs.",
    "cholesterol_risk": "Risk of total cholesterol exceeding 200 mg/dL — cardiovascular disease marker.",
    "low_hemoglobin_risk": "Risk of haemoglobin dropping below normal — anaemia screening indicator.",
    "ascvd": "Framingham-based probability of an adverse cardiovascular event within 10 years. Requires complete health profile.",
    "ascvd_level": "Stratified risk category derived from the ASCVD percentage score.",
}


def _pill_colors(label: str):
    if label in _GOOD:
        return GREEN_BG, GREEN
    if label in _WATCH:
        return AMBER_BG, AMBER
    if label in _BAD:
        return RED_BG, RED
    return GREY_BG, SLATE_500


def _risk_pill(risk_int) -> str:
    return RISK_LABEL.get(risk_int, "—")


def _fmt(value, decimals: int = 1) -> str:
    if value is None:
        return "—"
    try:
        return f"{float(value):.{decimals}f}"
    except (TypeError, ValueError):
        return "—"


def _int(value) -> str:
    if value is None:
        return "—"
    try:
        return str(int(value))
    except (TypeError, ValueError):
        return "—"


def _metrics_for_section(section_key: str) -> List[str]:
    if section_key in PDF_ROW_OVERRIDES:
        return PDF_ROW_OVERRIDES[section_key]
    return [m["id"] for m in metrics_for_pdf_section(section_key)]


def _pdf_display_name(metric_id: str, scan: Any) -> str:
    if metric_id in PDF_LABEL_OVERRIDES:
        return PDF_LABEL_OVERRIDES[metric_id]
    return pdf_metric_label(metric_id, scan)


def _scan_value_status(scan: Any, metric_id: str) -> Tuple[str, str, bool]:
    """Return (display_value, status_label, has_value) for one PDF row."""
    s = scan

    if metric_id == "pulse":
        v = s.pulse_rate
        val = f"{_int(v)} bpm" if v is not None else "—"
        if v is None:
            st = "—"
        elif 60 <= v <= 100:
            st = "Normal"
        elif v < 60:
            st = "Low"
        else:
            st = "Elevated"
        return val, st, v is not None

    if metric_id == "bp":
        if s.blood_pressure_systolic is not None:
            val = f"{_int(s.blood_pressure_systolic)} / {_int(s.blood_pressure_diastolic)} mmHg"
            sys_v = s.blood_pressure_systolic
            dia_v = s.blood_pressure_diastolic or 0
            st = "Normal" if sys_v < 120 and dia_v < 80 else "Elevated"
            return val, st, True
        return "—", "—", False

    if metric_id == "pulse_pressure":
        v = s.pulse_pressure
        return (f"{_int(v)} mmHg" if v is not None else "—", "—", v is not None)

    if metric_id == "map":
        v = s.mean_arterial_pressure
        return (f"{_int(v)} mmHg" if v is not None else "—", "—", v is not None)

    if metric_id == "cardiac_workload":
        v = s.cardiac_workload
        return (_fmt(v, 1), "—", v is not None)

    if metric_id == "heart_age":
        v = s.heart_age
        return (f"{_int(v)} yrs" if v is not None else "—", "—", v is not None)

    if metric_id == "resp_rate":
        v = s.respiration_rate
        return (f"{_int(v)} brpm" if v is not None else "—", "—", v is not None)

    if metric_id == "spo2":
        v = s.oxygen_saturation
        val = f"{_fmt(v, 1)}%" if v is not None else "—"
        st = ("Normal" if v >= 95 else "Low") if v is not None else "—"
        return val, st, v is not None

    if metric_id == "sdnn":
        v = s.sdnn
        val = f"{_fmt(v, 1)} ms" if v is not None else "—"
        if v is None:
            st = "—"
        elif v < 50:
            st = "Low (HRV)"
        else:
            st = "Normal"
        return val, st, v is not None

    if metric_id == "rmssd":
        v = s.rmssd
        return (f"{_fmt(v, 1)} ms" if v is not None else "—", "—", v is not None)

    if metric_id == "mean_rri":
        v = s.mean_rri
        return (f"{_int(v)} ms" if v is not None else "—", "—", v is not None)

    if metric_id == "lfhf":
        v = s.lfhf
        return (_fmt(v, 2), "—", v is not None)

    if metric_id == "prq":
        v = s.prq
        return (_fmt(v, 1), "—", v is not None)

    if metric_id == "pns":
        idx = s.pns_index
        zone = ZONE_LABEL.get(getattr(s, "pns_zone", None), "—")
        if idx is not None or getattr(s, "pns_zone", None) is not None:
            val = f"{_fmt(idx, 2)} / {zone}" if idx is not None else zone
            return val, zone if zone != "—" else "—", True
        return "—", "—", False

    if metric_id == "sns":
        idx = s.sns_index
        zone = ZONE_LABEL.get(getattr(s, "sns_zone", None), "—")
        if idx is not None or getattr(s, "sns_zone", None) is not None:
            val = f"{_fmt(idx, 2)} / {zone}" if idx is not None else zone
            return val, zone if zone != "—" else "—", True
        return "—", "—", False

    if metric_id == "stress_level":
        lvl = getattr(s, "stress_level", None)
        lbl = STRESS_LABEL.get(lvl, "—")
        if lbl in ("High", "Extreme"):
            st = "High (Stress)"
        else:
            st = lbl
        return lbl, st, lvl is not None

    if metric_id == "stress_index":
        v = s.stress_index
        return (_fmt(v, 0), "—", v is not None)

    if metric_id == "normalized_stress_index":
        v = s.normalized_stress_index
        return (f"{_fmt(v, 0)}%" if v is not None else "—", "—", v is not None)

    if metric_id == "wellness_level":
        lvl = getattr(s, "wellness_level", None)
        lbl = WELLNESS_LABEL.get(lvl, "—")
        return lbl, lbl, lvl is not None

    if metric_id == "wellness":
        v = getattr(s, "wellness_index", None)
        val = _fmt(v, 1) if v is not None else "—"
        st = WELLNESS_LABEL.get(getattr(s, "wellness_level", None), "—")
        return val, st, v is not None

    if metric_id == "hba1c":
        v = s.hemoglobin_a1c
        val = f"{_fmt(v, 1)}%" if v is not None else "—"
        st = _risk_pill(getattr(s, "high_hemoglobin_a1c_risk", None))
        return val, st, v is not None

    if metric_id == "hemoglobin":
        v = s.hemoglobin
        val = f"{_fmt(v, 1)} g/dL" if v is not None else "—"
        st = _risk_pill(getattr(s, "low_hemoglobin_risk", None))
        return val, st, v is not None

    if metric_id == "bp_risk":
        r = getattr(s, "high_blood_pressure_risk", None)
        lbl = _risk_pill(r)
        return lbl, lbl, r is not None

    if metric_id == "hba1c_risk":
        r = getattr(s, "high_hemoglobin_a1c_risk", None)
        lbl = _risk_pill(r)
        return lbl, lbl, r is not None

    if metric_id == "glucose_risk":
        r = getattr(s, "high_fasting_glucose_risk", None)
        lbl = _risk_pill(r)
        return lbl, lbl, r is not None

    if metric_id == "cholesterol_risk":
        r = getattr(s, "high_total_cholesterol_risk", None)
        lbl = _risk_pill(r)
        return lbl, lbl, r is not None

    if metric_id == "low_hemoglobin_risk":
        r = getattr(s, "low_hemoglobin_risk", None)
        lbl = _risk_pill(r)
        return lbl, lbl, r is not None

    if metric_id == "ascvd":
        v = s.ascvd_risk
        val = f"{_fmt(v, 1)}%" if v is not None else "—"
        st = _risk_pill(getattr(s, "ascvd_risk_level", None))
        return val, st, v is not None

    if metric_id == "ascvd_level":
        r = getattr(s, "ascvd_risk_level", None)
        lbl = _risk_pill(r)
        return lbl, lbl, r is not None

    return "—", "—", False


def _count_captured_metrics(scan: Any) -> int:
    count = 0
    for _, section_key in PDF_SECTIONS:
        for mid in _metrics_for_section(section_key):
            _, _, has = _scan_value_status(scan, mid)
            if has:
                count += 1
    return count


# ══════════════════════════════════════════════════════════════════════════════
# BUILDER CLASS
# ══════════════════════════════════════════════════════════════════════════════

class ReportBuilder:
    def __init__(
        self,
        scan: Any,
        user_name: str,
        user_email: str,
        logo_path: Optional[str] = None,
        user_age: Optional[int] = None,
    ):
        self.scan       = scan
        self.user_name  = user_name
        self.user_email = user_email
        self.user_age   = user_age
        self.logo_path  = _resolve_logo_path(logo_path)

        self.buf        = io.BytesIO()
        from reportlab.pdfgen import canvas as rl_canvas
        self.c          = rl_canvas.Canvas(self.buf, pagesize=A4)
        self.c.setTitle("My Wellfie — Digital Health Scan Report")
        self.page_num   = 1
        self.y          = TOP_Y

        styles = getSampleStyleSheet()
        self.st_label = ParagraphStyle(
            "Label", parent=styles["Normal"],
            fontName="Helvetica-Bold", fontSize=8.5,
            leading=12, textColor=SLATE_900)
        self.st_desc = ParagraphStyle(
            "Desc", parent=styles["Normal"],
            fontName="Helvetica", fontSize=7.5,
            leading=11, textColor=SLATE_700)
        self.st_note = ParagraphStyle(
            "Note", parent=styles["Normal"],
            fontName="Helvetica", fontSize=7.5,
            leading=11, textColor=SLATE_700)
        self.st_value = ParagraphStyle(
            "Value", parent=styles["Normal"],
            fontName="Helvetica-Bold", fontSize=9,
            leading=12, textColor=SLATE_900)
        self.st_target = ParagraphStyle(
            "Target", parent=styles["Normal"],
            fontName="Helvetica", fontSize=7.5,
            leading=11, textColor=SLATE_500)

    def _pill(self, x: float, y: float, label: str) -> None:
        _, fg = _pill_colors(label)
        c = self.c
        c.setFillColor(fg)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(x, y, label.upper())

    def _section_bar(self, title: str) -> None:
        self._check_space(10 * mm)
        c = self.c
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(ML, self.y - 5 * mm, title.upper())
        c.setStrokeColor(TEAL)
        c.setLineWidth(1)
        c.line(ML, self.y - 6.5 * mm, W - MR, self.y - 6.5 * mm)
        self.y -= 10 * mm

    def _check_space(self, needed: float) -> None:
        if self.y - needed < FOOTER_H + 6 * mm:
            self._end_page()
            self._begin_page()

    def _draw_header(self) -> None:
        c = self.c
        scan = self.scan

        c.setFillColor(TEAL)
        c.rect(0, H - HEADER_H, W, HEADER_H, fill=1, stroke=0)

        if self.logo_path and os.path.exists(self.logo_path):
            try:
                c.drawImage(self.logo_path, ML, H - 26 * mm,
                            width=38 * mm, height=13 * mm, mask="auto")
            except Exception:
                self._draw_brand_text()
        else:
            self._draw_brand_text()

        c.setFillColor(TEAL_LIGHT)
        c.setFont("Helvetica", 8.5)
        c.drawString(ML, H - 33 * mm, "Digital Health Scan Report")

        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 9)
        c.drawRightString(W - MR, H - 14 * mm, self.user_name)
        c.setFont("Helvetica", 8)
        c.setFillColor(TEAL_LIGHT)
        c.drawRightString(W - MR, H - 20 * mm, self.user_email)

        scanned = (
            scan.scanned_at.strftime("%d %b %Y  %I:%M %p UTC")
            if getattr(scan, "scanned_at", None)
            else "—"
        )
        c.drawRightString(W - MR, H - 26 * mm, f"Scan completed: {scanned}")

        duration = getattr(scan, "measurement_duration_sec", None)
        duration_text = f"{duration} s" if duration is not None else "—"
        c.setFont("Helvetica-Oblique", 7.5)
        c.drawRightString(
            W - MR, H - 32 * mm,
            f"Method: Facial optical scan · Duration: {duration_text}",
        )

        c.setStrokeColor(TEAL_LIGHT)
        c.setLineWidth(0.6)
        c.line(0, H - HEADER_H, W, H - HEADER_H)

    def _draw_brand_text(self) -> None:
        c = self.c
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(ML, H - 23 * mm, "MyWellfie")

    def _draw_footer(self) -> None:
        c = self.c
        c.setStrokeColor(SLATE_200)
        c.setLineWidth(0.4)
        c.line(ML, FOOTER_H, W - MR, FOOTER_H)

        c.setFillColor(SLATE_500)
        c.setFont("Helvetica", 6.5)
        c.drawCentredString(
            W / 2, FOOTER_H - 4 * mm,
            "For informational purposes only. AI-assisted physiological signal analysis — "
            "not a substitute for clinical diagnosis. Consult a qualified healthcare professional.",
        )
        c.drawCentredString(
            W / 2, FOOTER_H - 8 * mm,
            "Powered by BioSense Core Metrics Framework  ·  Confidential",
        )
        c.setFont("Helvetica", 7.5)
        c.setFillColor(SLATE_700)
        c.drawString(ML, FOOTER_H - 6 * mm, f"Page {self.page_num}")
        c.drawRightString(
            W - MR, FOOTER_H - 6 * mm,
            f"Generated: {datetime.utcnow().strftime('%d %b %Y %H:%M UTC')}",
        )

    def _begin_page(self) -> None:
        self._draw_header()
        self.y = TOP_Y - 4 * mm

    def _end_page(self) -> None:
        self._draw_footer()
        self.c.showPage()
        self.page_num += 1

    def _table_header(self) -> None:
        c = self.c
        hh = 5.5 * mm
        c.setFillColor(SLATE_100)
        c.rect(ML, self.y - hh, CW, hh, fill=1, stroke=0)
        c.setFillColor(SLATE_500)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(COL_IND + 2 * mm, self.y - 3.8 * mm, "INDICATOR")
        c.drawString(COL_RES, self.y - 3.8 * mm, "YOUR RESULT")
        c.drawString(COL_TGT, self.y - 3.8 * mm, "TARGET RANGE")
        c.drawString(COL_EXP, self.y - 3.8 * mm, "INDICATOR EXPLANATION")
        self.y -= hh

    def _pdf_row(self, metric_id: str, even: bool = True) -> None:
        scan = self.scan
        spec = get_metric_by_id(metric_id)
        name = _pdf_display_name(metric_id, scan)
        description = PDF_DESCRIPTIONS.get(metric_id, "")

        value, status, has_value = _scan_value_status(scan, metric_id)
        display_value = value
        if value == "—":
            reason = pdf_missing_reason(scan, metric_id, has_value)
            if reason:
                display_value = f"— ({reason})"

        ck = spec.get("confidenceKey") if spec else None
        conf = ""
        if spec and spec.get("hasConfidence"):
            conf = pdf_confidence_for_key(scan, ck)

        tgt = spec.get("targetDisplay", "—") if spec else "—"
        if metric_id == "heart_age" and self.user_age is not None:
            tgt = f"{int(self.user_age)} yrs"
        if metric_id in ("hba1c_risk", "low_hemoglobin_risk", "ascvd_level"):
            tgt = "Low"

        self._metric_row(name, description, display_value, tgt, status, confidence=conf)

    def _metric_row(
        self,
        name: str,
        description: str,
        value: str,
        target: str,
        status: str,
        confidence: str = "",
    ) -> None:
        c = self.c

        name_p = Paragraph(f"<b>{name}</b>", self.st_label)
        _, name_h = name_p.wrap(W_IND - 2 * mm, H)

        val_p = Paragraph(value.replace("—", "&#8212;"), self.st_value)
        _, val_h = val_p.wrap(W_RESULT - 1 * mm, H)

        status_h = 4 * mm if status and status != "—" else 0
        conf_h = 3.5 * mm if confidence else 0
        result_h = val_h + status_h + conf_h + 1 * mm

        tgt_p = Paragraph(target, self.st_target)
        _, tgt_h = tgt_p.wrap(W_TARGET - 1 * mm, H)

        desc_p = Paragraph(description, self.st_desc)
        _, desc_h = desc_p.wrap(W_EXPLAIN - 2 * mm, H)

        row_h = max(name_h, result_h, tgt_h, desc_h) + 3 * mm
        self._check_space(row_h)

        top = self.y - 1 * mm

        name_p.drawOn(c, COL_IND, top - name_h)
        val_p.drawOn(c, COL_RES, top - val_h)

        cursor_y = top - val_h - 1.5 * mm
        if status and status != "—":
            self._pill(COL_RES, cursor_y - 3 * mm, status)
            cursor_y -= status_h

        if confidence:
            c.setFillColor(SLATE_700)
            c.setFont("Helvetica", 6.5)
            c.drawString(COL_RES, cursor_y - 3 * mm, f"Conf: {confidence}")

        tgt_p.drawOn(c, COL_TGT, top - tgt_h)
        desc_p.drawOn(c, COL_EXP, top - desc_h)

        c.setStrokeColor(SLATE_200)
        c.setLineWidth(0.3)
        c.line(ML, self.y - row_h, W - MR, self.y - row_h)
        self.y -= row_h

    def _notes_box(self) -> None:
        notes = structured_disclaimer_notes(self.scan)
        self._check_space(40 * mm)
        c = self.c

        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(ML, self.y - 5 * mm, "SCAN QUALITY NOTES & COMPLIANCE INFORMATION")
        c.setStrokeColor(TEAL)
        c.setLineWidth(0.5)
        c.line(ML, self.y - 6.5 * mm, W - MR, self.y - 6.5 * mm)

        ny = self.y - 12 * mm
        for title, body in notes:
            p = Paragraph(f"<b>{title}:</b> {body}", self.st_note)
            _, ph = p.wrap(CW, H)
            p.drawOn(c, ML, ny - ph)
            ny -= ph + 3 * mm

        self.y = ny - 5 * mm

    def _draw_title_block(self) -> None:
        c = self.c
        s = self.scan

        c.setFillColor(SLATE_900)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(ML, self.y - 6 * mm, "HEALTH SCAN SUMMARY REPORT")

        scan_id = getattr(s, "id", "—")
        c.setFillColor(SLATE_500)
        c.setFont("Helvetica", 8)
        c.drawRightString(
            W - MR, self.y - 6 * mm,
            f"Scan ID: {str(scan_id)[:8].upper() if scan_id != '—' else '—'}",
        )

        c.setStrokeColor(SLATE_200)
        c.setLineWidth(0.5)
        c.line(ML, self.y - 8 * mm, W - MR, self.y - 8 * mm)
        self.y -= 11 * mm

        platform = str(getattr(s, "scan_platform", None) or "web").capitalize()
        duration = getattr(s, "measurement_duration_sec", None)
        duration_txt = f"{duration}s" if duration is not None else "—"
        captured = _count_captured_metrics(s)
        summary = f"Platform: {platform}  ·  Scan duration: {duration_txt}  ·  Metrics captured: {captured}"
        c.setFont("Helvetica", 7.5)
        c.setFillColor(SLATE_700)
        c.drawString(ML, self.y - 4 * mm, summary)
        self.y -= 9 * mm

    def build(self) -> bytes:
        self._begin_page()
        self._draw_title_block()

        for section_title, section_key in PDF_SECTIONS:
            self._section_bar(section_title)
            self._table_header()
            metric_ids = _metrics_for_section(section_key)
            for i, mid in enumerate(metric_ids):
                self._pdf_row(mid, even=(i % 2 == 0))
            self.y -= 3 * mm

        self._notes_box()
        self._end_page()
        self.c.save()
        return self.buf.getvalue()


def build_scan_pdf(
    scan: Any,
    user_name: str,
    user_email: str,
    logo_path: Optional[str] = None,
    user_age: Optional[int] = None,
) -> bytes:
    """Generate a full A4 health report PDF and return it as raw bytes."""
    return ReportBuilder(
        scan, user_name, user_email, logo_path, user_age=user_age,
    ).build()
