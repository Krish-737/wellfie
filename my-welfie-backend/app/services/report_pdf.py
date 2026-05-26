"""
My Wellfie — Health Scan PDF Report Generator  v3.1
=====================================================
Changes from v3.0:
  - STATUS column removed; status text embedded into YOUR RESULT column
  - Description moved from sub-row into dedicated INDICATOR EXPLANATION column
  - 4-column layout: INDICATOR | YOUR RESULT | TARGET RANGE | INDICATOR EXPLANATION
"""

from __future__ import annotations

import io
import os
from datetime import datetime
from typing import Any, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph

# ── Palette ────────────────────────────────────────────────────────────────────
TEAL        = colors.HexColor("#0f766e")
TEAL_MID    = colors.HexColor("#14b8a6")
TEAL_LIGHT  = colors.HexColor("#ccfbf1")
TEAL_PALE   = colors.HexColor("#f0fdfa")
SLATE_900   = colors.HexColor("#0f172a")
SLATE_700   = colors.HexColor("#334155")
SLATE_500   = colors.HexColor("#64748b")
SLATE_200   = colors.HexColor("#e2e8f0")
SLATE_100   = colors.HexColor("#f1f5f9")
SLATE_50    = colors.HexColor("#f8fafc")
WHITE       = colors.white
GREEN       = colors.HexColor("#16a34a")
GREEN_BG    = colors.HexColor("#dcfce7")
AMBER       = colors.HexColor("#b45309")
AMBER_BG    = colors.HexColor("#fef3c7")
RED         = colors.HexColor("#dc2626")
RED_BG      = colors.HexColor("#fee2e2")
GREY_BG     = colors.HexColor("#f1f5f9")
LINK_BLUE   = colors.HexColor("#2563eb")

# ── Page geometry ──────────────────────────────────────────────────────────────
W, H        = A4
ML          = 18 * mm
MR          = 18 * mm
CW          = W - ML - MR
HEADER_H    = 44 * mm
FOOTER_H    = 16 * mm
TOP_Y       = H - HEADER_H

DEFAULT_LOGO_PATH = r"C:\Users\KishorekumarS\Downloads\my-welfie-2\my-welfie-2\my-welfie-backend\app\services\mywellfie-header-logo.png"

# ── Enum label maps ────────────────────────────────────────────────────────────
RISK_LABEL   = {None: "—", 0: "Unknown", 1: "Low", 2: "Medium", 3: "High"}
ZONE_LABEL   = {None: "—", 0: "Unknown", 1: "Low",  2: "Normal", 3: "High"}
STRESS_LABEL = {None: "—", 0: "Unknown", 1: "Very Low", 2: "Low",
                3: "Normal", 4: "High",  5: "Extreme"}
WELLNESS_LABEL = {None: "—", 0: "Unknown", 1: "Low", 2: "Normal", 3: "High"}

# ── Status colour sets (used only for colouring the result text) ───────────────
_GOOD  = {"Low", "Very Low", "Normal", "Optimal", "Healthy", "Good", "High (SpO2)"}
_WATCH = {"Medium", "Moderate", "Elevated", "High (Stress)", "Low (HRV)"}
_BAD   = {"High", "Extreme", "Critical"}

def _status_color(label: str):
    """Return a foreground color based on status label."""
    if label in _GOOD:  return GREEN
    if label in _WATCH: return AMBER
    if label in _BAD:   return RED
    return SLATE_900

def _risk_pill(risk_int):
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


# ══════════════════════════════════════════════════════════════════════════════
# BUILDER CLASS
# ══════════════════════════════════════════════════════════════════════════════

class ReportBuilder:

    # ── Column positions — 4-column layout ────────────────────────────────────
    # INDICATOR(35mm) | YOUR RESULT(30mm) | TARGET RANGE(25mm) | EXPLANATION(rest)
    COL_NAME = ML
    COL_VAL  = ML + 38 * mm
    COL_TGT  = ML + 70 * mm
    COL_DESC = ML + 100 * mm

    def __init__(self, scan: Any, user_name: str, user_email: str,
                 logo_path: str = DEFAULT_LOGO_PATH):
        self.scan       = scan
        self.user_name  = user_name
        self.user_email = user_email
        self.logo_path  = logo_path

        self.buf  = io.BytesIO()
        from reportlab.pdfgen import canvas as rl_canvas
        self.c    = rl_canvas.Canvas(self.buf, pagesize=A4)
        self.c.setTitle("My Wellfie — Digital Health Scan Report")
        self.page_num = 1
        self.y    = TOP_Y

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

    # ── Primitives ─────────────────────────────────────────────────────────────

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

    # ── Page chrome ────────────────────────────────────────────────────────────

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
        c.setFont("Helvetica-Oblique", 7.5)
        c.drawRightString(W - MR, H - 32 * mm, "Method: Facial optical scan · 40 s duration")

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
            "For informational purposes only. Not a substitute for clinical diagnosis. "
            "Consult a qualified healthcare professional.")
        c.drawCentredString(
            W / 2, FOOTER_H - 8 * mm,
            "Generated using AI-assisted physiological signal analysis · Confidential")
        c.setFont("Helvetica", 7.5)
        c.setFillColor(SLATE_700)
        c.drawString(ML, FOOTER_H - 6 * mm, f"Page {self.page_num}")
        c.drawRightString(
            W - MR, FOOTER_H - 6 * mm,
            f"Generated: {datetime.utcnow().strftime('%d %b %Y %H:%M UTC')}")

    def _begin_page(self) -> None:
        self._draw_header()
        self.y = TOP_Y - 4 * mm

    def _end_page(self) -> None:
        self._draw_footer()
        self.c.showPage()
        self.page_num += 1

    # ── Table header — 4 columns ───────────────────────────────────────────────

    def _table_header(self) -> None:
        c = self.c
        hh = 5.5 * mm
        c.setFillColor(SLATE_100)
        c.rect(ML, self.y - hh, CW, hh, fill=1, stroke=0)
        c.setFillColor(SLATE_500)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(self.COL_NAME + 2 * mm, self.y - 3.8 * mm, "INDICATOR")
        c.drawString(self.COL_VAL,           self.y - 3.8 * mm, "YOUR RESULT")
        c.drawString(self.COL_TGT,           self.y - 3.8 * mm, "TARGET RANGE")
        c.drawString(self.COL_DESC,          self.y - 3.8 * mm, "INDICATOR EXPLANATION")
        self.y -= hh

    # ── Metric row — status embedded in YOUR RESULT, explanation as column ─────

    def _metric_row(self, name: str, description: str,
                    value: str, target: str,
                    status: str = "—") -> None:
        """
        4-column metric row:
          INDICATOR       — bold name only (no sub-description)
          YOUR RESULT     — value, with status appended in colour if available
          TARGET RANGE    — reference range
          INDICATOR EXPLANATION — the description text as its own column
        """
        c = self.c

        # ── Col 1: Indicator name ──────────────────────────────────────────────
        name_p = Paragraph(f"<b>{name}</b>", self.st_label)
        _, name_h = name_p.wrap(34 * mm, H)

        # ── Col 2: Value + status (coloured) ──────────────────────────────────
        # Build combined value string: "72 bpm\nNormal" — status on new line in colour
        if status and status not in ("—", ""):
            stat_color = _status_color(status)
            # Encode color as hex for Paragraph markup
            hex_col = "#{:02x}{:02x}{:02x}".format(
                int(stat_color.red * 255),
                int(stat_color.green * 255),
                int(stat_color.blue * 255),
            )
            val_html = (
                f'<b>{value}</b><br/>'
                f'<font color="{hex_col}"><b>{status}</b></font>'
            )
        else:
            val_html = f"<b>{value}</b>"

        val_p = Paragraph(val_html, self.st_desc)
        _, val_h = val_p.wrap(27 * mm, H)

        # ── Col 3: Target ──────────────────────────────────────────────────────
        tgt_p = Paragraph(target, self.st_desc)
        _, tgt_h = tgt_p.wrap(25 * mm, H)

        # ── Col 4: Explanation ─────────────────────────────────────────────────
        desc_p = Paragraph(description, self.st_desc)
        desc_col_w = W - MR - self.COL_DESC          # remaining width to right margin
        _, desc_h = desc_p.wrap(desc_col_w, H)

        # Row height = tallest column + padding
        row_h = max(name_h, val_h, tgt_h, desc_h) + 5 * mm

        self._check_space(row_h)

        base_y = self.y - 1.5 * mm   # top padding inside row

        name_p.drawOn(c, self.COL_NAME, base_y - name_h)
        val_p.drawOn(c,  self.COL_VAL,  base_y - val_h)
        tgt_p.drawOn(c,  self.COL_TGT,  base_y - tgt_h)
        desc_p.drawOn(c, self.COL_DESC, base_y - desc_h)

        # Bottom divider
        c.setStrokeColor(SLATE_200)
        c.setLineWidth(0.3)
        c.line(ML, self.y - row_h, W - MR, self.y - row_h)

        self.y -= row_h

    # ── Notes box ─────────────────────────────────────────────────────────────

    def _notes_box(self) -> None:
        notes = [
            ("1. General wellness disclaimer",
             "These metrics are for general wellness monitoring only. They are not a clinical diagnosis "
             "and do not replace consultation with a qualified medical practitioner or lab-based tests."),
            ("2. Signal confidence",
             "Confidence indices reflect optical frame capture quality. High values indicate clean, "
             "well-lit facial frames. Poor lighting, movement, or incorrect positioning lower accuracy."),
            ("3. Missing or dashed values",
             "A '—' result means the SDK could not produce that metric for this session. Ensure face "
             "is well-lit, device is stable, and follow the preparation checklist before retrying."),
        ]
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

    # ── Build ──────────────────────────────────────────────────────────────────

    def build(self) -> bytes:
        s = self.scan

        # ══ PAGE 1 ════════════════════════════════════════════════════════════
        self._begin_page()

        c = self.c
        c.setFillColor(SLATE_900)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(ML, self.y - 6 * mm, "HEALTH SCAN SUMMARY REPORT")
        c.setFillColor(SLATE_500)
        c.setFont("Helvetica", 8)
        scan_id = getattr(s, "id", "—")
        c.drawRightString(W - MR, self.y - 6 * mm,
                          f"Scan ID: {str(scan_id)[:8].upper() if scan_id != '—' else '—'}")
        c.setStrokeColor(SLATE_200)
        c.setLineWidth(0.5)
        c.line(ML, self.y - 8 * mm, W - MR, self.y - 8 * mm)
        self.y -= 12 * mm

        # ── SECTION 1: Cardiovascular ─────────────────────────────────────────
        self._section_bar("1 · Cardiovascular")
        self._table_header()

        bp_val = (
            f"{_fmt(s.blood_pressure_systolic,0)} / {_fmt(s.blood_pressure_diastolic,0)} mmHg"
            if getattr(s, "blood_pressure_systolic", None) else "—"
        )
        bp_status = _risk_pill(getattr(s, "high_blood_pressure_risk", None))

        rows_cardio = [
            ("Heart Rate",
             "Heart Rate reflects the number of heart beats per minute. Healthy resting values for most adults typically range between 60–100 bpm.",
             f"{_fmt(s.pulse_rate,0)} bpm", "60–100 bpm", "—"),
            ("Blood Pressure",
             "Blood Pressure measures the force of blood against artery walls during heart contraction and relaxation phases.",
             bp_val, "<129/80 mmHg", bp_status),
            ("Pulse Pressure",
             "Pulse Pressure reflects the difference between systolic and diastolic pressure and may indicate arterial flexibility.",
             f"{_fmt(s.pulse_pressure,0)} mmHg", "25–50 mmHg", "—"),
            ("Mean Arterial Pressure",
             "Mean Arterial Pressure estimates the average arterial pressure throughout one cardiac cycle and helps assess tissue perfusion.",
             f"{_fmt(s.mean_arterial_pressure,0)} mmHg", "70–100 mmHg", "—"),
            ("Cardiac Workload",
             "Cardiac Workload estimates the physiological demand placed on the heart during circulation.",
             _fmt(s.cardiac_workload, 1), "3.9–4.2", "—"),
            ("Heart Age",
             "Heart Age estimates cardiovascular system health relative to expected physiological age using multiple cardiac indicators.",
             f"{_fmt(s.heart_age,0)} yrs", "Match your age", "—"),
        ]
        for nm, desc, val, tgt, st in rows_cardio:
            self._metric_row(nm, desc, val, tgt, st)
        self.y -= 3 * mm

        # ── SECTION 2: Respiratory ────────────────────────────────────────────
        self._section_bar("2 · Respiratory")
        self._table_header()

        spo2_val    = f"{_fmt(s.oxygen_saturation,1)} %"
        spo2_status = "High (SpO2)" if (getattr(s,"oxygen_saturation",None) or 0) >= 95 else "High"

        rows_resp = [
            ("Breathing Rate",
             "Breathing Rate reflects the number of respiratory cycles per minute during rest.",
             f"{_fmt(s.respiration_rate,0)} brpm", "12–20 brpm", "—"),
            ("Oxygen Saturation (SpO2)",
             "Oxygen Saturation measures the percentage of oxygen carried by red blood cells throughout the body.",
             spo2_val, ">95%", spo2_status),
        ]
        for nm, desc, val, tgt, st in rows_resp:
            self._metric_row(nm, desc, val, tgt, st)
        self.y -= 3 * mm

        # ══ PAGE 2 ════════════════════════════════════════════════════════════
        self._end_page()
        self._begin_page()

        # ── SECTION 3: HRV / Autonomic ────────────────────────────────────────
        self._section_bar("3 · HRV & Autonomic Nervous System")
        self._table_header()

        pns_label = ZONE_LABEL.get(getattr(s, "pns_zone", None), "—")
        sns_label = ZONE_LABEL.get(getattr(s, "sns_zone", None), "—")

        rows_hrv = [
            ("SDNN",
             "SDNN is a Heart Rate Variability metric reflecting overall autonomic nervous system adaptability and recovery capacity.",
             f"{_fmt(s.sdnn,1)} ms", ">=50 ms",
             "Low (HRV)" if (getattr(s,"sdnn",None) or 999) < 50 else "Normal"),
            ("RMSSD",
             "RMSSD reflects short-term heart rate variability associated with parasympathetic nervous system activity and recovery state.",
             f"{_fmt(s.rmssd,1)} ms", "20–43 ms", "—"),
            ("Mean RRI",
             "Mean RRi represents the average interval between consecutive heartbeats.",
             f"{_fmt(s.mean_rri,0)} ms", "<1000 ms", "—"),
            ("SD1",
             "SD1 reflects short-term beat-to-beat variability associated with autonomic regulation.",
             f"{_fmt(s.sd1,1)} ms", ">10 ms", "—"),
            ("SD2",
             "SD2 reflects long-term variability patterns associated with cardiovascular adaptability.",
             f"{_fmt(s.sd2,1)} ms", ">20 ms", "—"),
            ("LF/HF Ratio",
             "LF/HF Ratio reflects the balance between sympathetic and parasympathetic nervous system activity.",
             _fmt(s.lfhf, 2), "0.5–2.0", "—"),
            ("PRQ",
             "PRQ reflects the coordination efficiency between respiratory and cardiovascular activity.",
             _fmt(s.prq, 1), "~5", "—"),
            ("PNS Index / Zone",
             "PNS Index estimates parasympathetic nervous system activity associated with recovery and relaxation responses.",
             f"{_fmt(s.pns_index,2)} / {pns_label}", "Normal zone", pns_label),
            ("SNS Index / Zone",
             "SNS Index estimates sympathetic nervous system activity associated with physiological stress response.",
             f"{_fmt(s.sns_index,2)} / {sns_label}", "Normal zone", sns_label),
        ]
        for nm, desc, val, tgt, st in rows_hrv:
            self._metric_row(nm, desc, val, tgt, st)
        self.y -= 3 * mm

        # ── SECTION 4: Stress & Wellness ──────────────────────────────────────
        self._section_bar("4 · Stress & Wellness")
        self._table_header()

        stress_label   = STRESS_LABEL.get(getattr(s, "stress_level", None), "—")
        wellness_label = WELLNESS_LABEL.get(getattr(s, "wellness_level", None), "—")

        rows_stress = [
            ("Stress Level",
             "Stress Level reflects autonomic nervous system activity and the body's physiological response to stress.",
             stress_label, "Low / Normal",
             "High (Stress)" if stress_label in ("High","Extreme") else stress_label),
            ("Stress Index (raw)",
             "Stress Index is a numerical representation of autonomic nervous system load and cardiovascular stress adaptation.",
             _fmt(s.stress_index, 0), "<150", "—"),
            ("Normalised Stress Index",
             "Normalized Stress Index scales physiological stress measurements into a standardized percentage range.",
             f"{_fmt(s.normalized_stress_index,0)}%", "<40%", "—"),
            ("Wellness Level",
             "Wellness Level represents overall physiological balance derived from multiple cardiovascular indicators.",
             wellness_label, "Normal / High", wellness_label),
            ("Wellness Index",
             "Wellness Index is a composite physiological wellness indicator associated with cardiovascular balance and recovery efficiency.",
             _fmt(s.wellness_index, 1), ">6", "—"),
        ]
        for nm, desc, val, tgt, st in rows_stress:
            self._metric_row(nm, desc, val, tgt, st)
        self.y -= 3 * mm

        # ══ PAGE 3 ════════════════════════════════════════════════════════════
        self._end_page()
        self._begin_page()

        # ── SECTION 5: Metabolic / Bloodless Biomarkers ───────────────────────
        self._section_bar("5 · Metabolic & Bloodless Biomarkers")
        self._table_header()

        hba1c_risk = _risk_pill(getattr(s, "high_hemoglobin_a1c_risk", None))
        hgb_risk   = _risk_pill(getattr(s, "low_hemoglobin_risk", None))

        rows_meta = [
            ("Haemoglobin A1c (HbA1c)",
             "HbA1c reflects average blood glucose levels over the previous 2–3 months.",
             f"{_fmt(s.hemoglobin_a1c,1)}%", "<5.7%", hba1c_risk),
            ("Haemoglobin",
             "Haemoglobin is responsible for transporting oxygen throughout the body.",
             f"{_fmt(s.hemoglobin,1)} g/dL", "M: 14–18 / F: 12–16 g/dL", hgb_risk),
        ]
        for nm, desc, val, tgt, st in rows_meta:
            self._metric_row(nm, desc, val, tgt, st)
        self.y -= 3 * mm

        # ── SECTION 6: Cardio-Metabolic Risk Scores ───────────────────────────
        self._section_bar("6 · Cardio-Metabolic Risk Scores")
        self._table_header()

        rows_risk = [
            ("High Blood Pressure Risk",
             "Indicates whether measured blood pressure values exceed standard healthy thresholds.",
             _risk_pill(getattr(s,"high_blood_pressure_risk",None)), "Low",
             _risk_pill(getattr(s,"high_blood_pressure_risk",None))),
            ("High HbA1c Risk",
             "Indicates whether HbA1c values exceed standard glucose regulation thresholds.",
             _risk_pill(getattr(s,"high_hemoglobin_a1c_risk",None)), "Low",
             _risk_pill(getattr(s,"high_hemoglobin_a1c_risk",None))),
            ("High Fasting Glucose Risk",
             "Indicates whether fasting glucose values may exceed recommended healthy ranges.",
             _risk_pill(getattr(s,"high_fasting_glucose_risk",None)), "Low",
             _risk_pill(getattr(s,"high_fasting_glucose_risk",None))),
            ("High Total Cholesterol Risk",
             "Indicates whether total cholesterol values may exceed recommended healthy ranges.",
             _risk_pill(getattr(s,"high_total_cholesterol_risk",None)), "Low",
             _risk_pill(getattr(s,"high_total_cholesterol_risk",None))),
            ("Low Haemoglobin Risk",
             "Indicates whether haemoglobin levels may fall below recommended healthy ranges.",
             _risk_pill(getattr(s,"low_hemoglobin_risk",None)), "Low",
             _risk_pill(getattr(s,"low_hemoglobin_risk",None))),
        ]
        for nm, desc, val, tgt, st in rows_risk:
            self._metric_row(nm, desc, val, tgt, st)
        self.y -= 3 * mm

        # ── SECTION 7: ASCVD ──────────────────────────────────────────────────
        self._section_bar("7 · ASCVD 10-Year Cardiovascular Risk")
        self._table_header()

        ascvd_level = _risk_pill(getattr(s, "ascvd_risk_level", None))

        rows_ascvd = [
            ("ASCVD Risk Score",
             "ASCVD Risk estimates the likelihood of future cardiovascular events based on multiple physiological indicators.",
             f"{_fmt(s.ascvd_risk,1)}%", "<10% (Low)", ascvd_level),
            ("ASCVD Risk Level",
             "ASCVD Risk Level categorizes cardiovascular risk into generalized severity groups.",
             ascvd_level, "Low", ascvd_level),
            ("Heart Age",
             "Heart Age estimates cardiovascular system health relative to expected physiological age.",
             f"{_fmt(s.heart_age,0)} yrs", "Match your age", "—"),
        ]
        for nm, desc, val, tgt, st in rows_ascvd:
            self._metric_row(nm, desc, val, tgt, st)
        self.y -= 5 * mm

        # ── Notes & Compliance ────────────────────────────────────────────────
        self._notes_box()

        self._end_page()
        self.c.save()
        return self.buf.getvalue()


# ── Public entry point ────────────────────────────────────────────────────────

def build_scan_pdf(scan: Any, user_name: str, user_email: str,
                   logo_path: str = DEFAULT_LOGO_PATH) -> bytes:
    return ReportBuilder(scan, user_name, user_email, logo_path).build()


# ── Sample runner ─────────────────────────────────────────────────────────────

class _Sample:
    id = "abc12345"
    scanned_at = None
    pulse_rate = 72
    blood_pressure_systolic  = 118
    blood_pressure_diastolic = 76
    pulse_pressure           = 42
    mean_arterial_pressure   = 90
    cardiac_workload         = 4.1
    heart_age                = 34
    respiration_rate         = 15
    oxygen_saturation        = 98.2
    sdnn        = 62.4
    rmssd       = 38.1
    mean_rri    = 833
    sd1         = 27.0
    sd2         = 83.5
    lfhf        = 1.2
    prq         = 4.9
    pns_index   = 0.45
    pns_zone    = 2
    sns_index   = -0.30
    sns_zone    = 2
    stress_index              = 120
    stress_level              = 3
    normalized_stress_index   = 32
    wellness_index            = 7.2
    wellness_level            = 3
    hemoglobin_a1c            = 5.3
    hemoglobin                = 15.6
    ascvd_risk                = 4.7
    ascvd_risk_level          = 1
    high_blood_pressure_risk  = 1
    high_hemoglobin_a1c_risk  = 1
    low_hemoglobin_risk       = 1
    high_fasting_glucose_risk = 1
    high_total_cholesterol_risk = 1

if __name__ == "__main__":
    pdf = build_scan_pdf(_Sample(), "Alex Johnson", "alex.johnson@example.com", logo_path="")
    out = "/mnt/user-data/outputs/mywellfie_report_v31.pdf"
    with open(out, "wb") as f:
        f.write(pdf)
    print(f"Saved → {out}  ({len(pdf):,} bytes)")
