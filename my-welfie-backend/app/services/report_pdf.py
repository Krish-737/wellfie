"""
My Wellfie — Health Scan PDF Report Generator  v4.0
=====================================================
Changes from v3.1:
  - Logo loaded dynamically from scan object or passed path — no hardcoded path
  - All status values derived dynamically from actual metric values — no hardcoded status
  - Rows with missing/None values are skipped entirely (no "—" rows rendered)
  - 4-column layout: INDICATOR | YOUR RESULT | TARGET RANGE | INDICATOR EXPLANATION
"""

from __future__ import annotations

import io
import os
from datetime import datetime, timezone
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph

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
AMBER       = colors.HexColor("#b45309")
RED         = colors.HexColor("#dc2626")

# ── Page geometry ──────────────────────────────────────────────────────────────
W, H      = A4
ML        = 18 * mm
MR        = 18 * mm
CW        = W - ML - MR
HEADER_H  = 44 * mm
FOOTER_H  = 16 * mm
TOP_Y     = H - HEADER_H

# ── Enum label maps ────────────────────────────────────────────────────────────
RISK_LABEL    = {0: "Unknown", 1: "Low", 2: "Medium", 3: "High"}
ZONE_LABEL    = {0: "Unknown", 1: "Low",  2: "Normal", 3: "High"}
STRESS_LABEL  = {0: "Unknown", 1: "Very Low", 2: "Low", 3: "Normal", 4: "High", 5: "Extreme"}
WELLNESS_LABEL= {0: "Unknown", 1: "Low", 2: "Normal", 3: "High"}

# ── Dynamic status evaluation ──────────────────────────────────────────────────

def _eval_status(key: str, value) -> str:
    """
    Derive status label purely from metric key + actual value.
    Returns "" if no status rule applies (caller treats "" as no status).
    """
    if value is None:
        return ""
    try:
        v = float(value)
    except (TypeError, ValueError):
        return ""

    rules = {
        "pulse_rate":             lambda x: "Normal" if 60 <= x <= 100 else ("Low" if x < 60 else "High"),
        "pulse_pressure":         lambda x: "Normal" if 25 <= x <= 50  else ("Low" if x < 25  else "High"),
        "mean_arterial_pressure": lambda x: "Normal" if 70 <= x <= 100 else ("Low" if x < 70  else "High"),
        "cardiac_workload":       lambda x: "Normal" if 3.9 <= x <= 4.2 else ("Low" if x < 3.9 else "High"),
        "respiration_rate":       lambda x: "Normal" if 12 <= x <= 20  else ("Low" if x < 12  else "High"),
        "oxygen_saturation":      lambda x: "Normal" if x >= 95 else "Low",
        "sdnn":                   lambda x: "Normal" if x >= 50 else "Low",
        "rmssd":                  lambda x: "Normal" if 20 <= x <= 43  else ("Low" if x < 20  else "High"),
        "mean_rri":               lambda x: "Normal" if x < 1000 else "High",
        "sd1":                    lambda x: "Normal" if x > 10 else "Low",
        "sd2":                    lambda x: "Normal" if x > 20 else "Low",
        "lfhf":                   lambda x: "Normal" if 0.5 <= x <= 2.0 else ("Low" if x < 0.5 else "High"),
        "stress_index":           lambda x: "Normal" if x < 150 else "High",
        "normalized_stress_index":lambda x: "Normal" if x < 40  else "High",
        "wellness_index":         lambda x: "Normal" if x > 6   else "Low",
        "hemoglobin_a1c":         lambda x: "Normal" if x < 5.7 else "High",
        "hemoglobin":             lambda x: "Normal" if x >= 12  else "Low",
        "ascvd_risk":             lambda x: "Normal" if x < 10  else "High",
    }

    fn = rules.get(key)
    return fn(v) if fn else ""


def _status_color(label: str):
    _GOOD  = {"Low", "Very Low", "Normal", "Optimal", "Healthy", "Good"}
    _WATCH = {"Medium", "Moderate", "Elevated"}
    _BAD   = {"High", "Extreme", "Critical"}
    if label in _GOOD:  return GREEN
    if label in _WATCH: return AMBER
    if label in _BAD:   return RED
    return SLATE_700


def _risk_label(risk_int) -> str:
    if risk_int is None:
        return ""
    return RISK_LABEL.get(int(risk_int), "")


def _zone_label(zone_int) -> str:
    if zone_int is None:
        return ""
    return ZONE_LABEL.get(int(zone_int), "")


def _fmt(value, decimals: int = 1) -> str:
    if value is None:
        return ""
    try:
        return f"{float(value):.{decimals}f}"
    except (TypeError, ValueError):
        return ""


def _has(value) -> bool:
    """True if value is present and non-None."""
    return value is not None


# ══════════════════════════════════════════════════════════════════════════════
# BUILDER
# ══════════════════════════════════════════════════════════════════════════════

class ReportBuilder:

    COL_NAME = ML
    COL_VAL  = ML + 38 * mm
    COL_TGT  = ML + 70 * mm
    COL_DESC = ML + 100 * mm

    def __init__(self, scan: Any, user_name: str, user_email: str,
                 logo_path: str = ""):
        self.scan       = scan
        self.user_name  = user_name
        self.user_email = user_email
        # Resolve logo: explicit arg > scan attribute > none
        self.logo_path  = (
            logo_path
            or getattr(scan, "logo_path", None)
            or getattr(scan, "brand_logo", None)
            or ""
        )

        self.buf = io.BytesIO()
        from reportlab.pdfgen import canvas as rl_canvas
        self.c   = rl_canvas.Canvas(self.buf, pagesize=A4)
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

    # ── Page chrome ────────────────────────────────────────────────────────────

    def _draw_brand_text(self) -> None:
        c = self.c
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(ML, H - 23 * mm, "MyWellfie")

    def _draw_header(self) -> None:
        c = self.c
        s = self.scan

        c.setFillColor(TEAL)
        c.rect(0, H - HEADER_H, W, HEADER_H, fill=1, stroke=0)

        # Logo: try path, fall back to brand text
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

        # Right — patient info
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 9)
        c.drawRightString(W - MR, H - 14 * mm, self.user_name)
        c.setFont("Helvetica", 8)
        c.setFillColor(TEAL_LIGHT)
        c.drawRightString(W - MR, H - 20 * mm, self.user_email)

        scanned_at = getattr(s, "scanned_at", None)
        scanned = (
            scanned_at.strftime("%d %b %Y  %I:%M %p UTC")
            if scanned_at else "—"
        )
        c.drawRightString(W - MR, H - 26 * mm, f"Scan completed: {scanned}")
        c.setFont("Helvetica-Oblique", 7.5)
        c.drawRightString(W - MR, H - 32 * mm, "Method: Facial optical scan · 40 s duration")

        c.setStrokeColor(TEAL_LIGHT)
        c.setLineWidth(0.6)
        c.line(0, H - HEADER_H, W, H - HEADER_H)

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
            f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')}")

    def _begin_page(self) -> None:
        self._draw_header()
        self.y = TOP_Y - 4 * mm

    def _end_page(self) -> None:
        self._draw_footer()
        self.c.showPage()
        self.page_num += 1

    def _check_space(self, needed: float) -> None:
        if self.y - needed < FOOTER_H + 6 * mm:
            self._end_page()
            self._begin_page()

    # ── Section & table helpers ────────────────────────────────────────────────

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

    # ── Core metric row ────────────────────────────────────────────────────────

    def _metric_row(self, name: str, explanation: str,
                    value: str, target: str,
                    status: str = "") -> None:
        """
        Renders one row. If value is empty/blank, row is skipped entirely.
        Status is shown below value in colour — never as a separate column.
        """
        if not value or not value.strip():
            return

        c = self.c

        # Col 1: Indicator name
        name_p = Paragraph(f"<b>{name}</b>", self.st_label)
        _, name_h = name_p.wrap(34 * mm, H)

        # Col 2: Value + optional coloured status on next line
        if status:
            col = _status_color(status)
            hex_col = "#{:02x}{:02x}{:02x}".format(
                int(col.red * 255),
                int(col.green * 255),
                int(col.blue * 255),
            )
            val_html = f'<b>{value}</b><br/><font color="{hex_col}"><b>{status}</b></font>'
        else:
            val_html = f"<b>{value}</b>"

        val_p = Paragraph(val_html, self.st_desc)
        _, val_h = val_p.wrap(27 * mm, H)

        # Col 3: Target range
        tgt_p = Paragraph(target, self.st_desc)
        _, tgt_h = tgt_p.wrap(25 * mm, H)

        # Col 4: Explanation
        desc_col_w = W - MR - self.COL_DESC
        desc_p = Paragraph(explanation, self.st_desc)
        _, desc_h = desc_p.wrap(desc_col_w, H)

        row_h = max(name_h, val_h, tgt_h, desc_h) + 5 * mm
        self._check_space(row_h)

        base_y = self.y - 1.5 * mm
        name_p.drawOn(c, self.COL_NAME, base_y - name_h)
        val_p.drawOn(c,  self.COL_VAL,  base_y - val_h)
        tgt_p.drawOn(c,  self.COL_TGT,  base_y - tgt_h)
        desc_p.drawOn(c, self.COL_DESC, base_y - desc_h)

        c.setStrokeColor(SLATE_200)
        c.setLineWidth(0.3)
        c.line(ML, self.y - row_h, W - MR, self.y - row_h)
        self.y -= row_h

    # ── Render a section only if at least one row has data ────────────────────

    def _render_section(self, title: str, rows: list) -> None:
        """
        rows: list of (name, explanation, value_str, target, status)
        Skips individual rows where value_str is empty.
        Skips entire section if all rows are empty.
        """
        visible = [(n, e, v, t, st) for n, e, v, t, st in rows if v and v.strip()]
        if not visible:
            return
        self._section_bar(title)
        self._table_header()
        for n, e, v, t, st in visible:
            self._metric_row(n, e, v, t, st)
        self.y -= 3 * mm

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
             "A missing result means the SDK could not produce that metric for this session. Ensure the "
             "face is well-lit, device is stable, and follow the preparation checklist before retrying."),
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

        # ══ PAGE 1 ═══════════════════════════════════════════════════════════
        self._begin_page()

        # Summary strip
        c = self.c
        c.setFillColor(SLATE_900)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(ML, self.y - 6 * mm, "HEALTH SCAN SUMMARY REPORT")
        scan_id = getattr(s, "id", None)
        if scan_id:
            c.setFillColor(SLATE_500)
            c.setFont("Helvetica", 8)
            c.drawRightString(W - MR, self.y - 6 * mm,
                              f"Scan ID: {str(scan_id)[:8].upper()}")
        c.setStrokeColor(SLATE_200)
        c.setLineWidth(0.5)
        c.line(ML, self.y - 8 * mm, W - MR, self.y - 8 * mm)
        self.y -= 12 * mm

        # ── SECTION 1: Cardiovascular ─────────────────────────────────────────
        sys_v  = getattr(s, "blood_pressure_systolic",  None)
        dia_v  = getattr(s, "blood_pressure_diastolic", None)
        bp_val = (
            f"{_fmt(sys_v,0)} / {_fmt(dia_v,0)} mmHg"
            if _has(sys_v) and _has(dia_v) else ""
        )
        bp_risk    = _risk_label(getattr(s, "high_blood_pressure_risk", None))
        bp_status  = bp_risk  # use the risk label as status for BP

        hr_v  = getattr(s, "pulse_rate", None)
        pp_v  = getattr(s, "pulse_pressure", None)
        map_v = getattr(s, "mean_arterial_pressure", None)
        cw_v  = getattr(s, "cardiac_workload", None)
        ha_v  = getattr(s, "heart_age", None)

        rows_cardio = [
            ("Heart Rate",
             "Heart Rate reflects the number of heart beats per minute. Healthy resting values for most adults typically range between 60–100 bpm.",
             f"{_fmt(hr_v,0)} bpm" if _has(hr_v) else "",
             "60–100 bpm",
             _eval_status("pulse_rate", hr_v)),

            ("Blood Pressure",
             "Blood Pressure measures the force of blood against artery walls during heart contraction and relaxation phases.",
             bp_val, "<129/80 mmHg", bp_status),

            ("Pulse Pressure",
             "Pulse Pressure reflects the difference between systolic and diastolic pressure and may indicate arterial flexibility.",
             f"{_fmt(pp_v,0)} mmHg" if _has(pp_v) else "",
             "25–50 mmHg",
             _eval_status("pulse_pressure", pp_v)),

            ("Mean Arterial Pressure",
             "Mean Arterial Pressure estimates the average arterial pressure throughout one cardiac cycle and helps assess tissue perfusion.",
             f"{_fmt(map_v,0)} mmHg" if _has(map_v) else "",
             "70–100 mmHg",
             _eval_status("mean_arterial_pressure", map_v)),

            ("Cardiac Workload",
             "Cardiac Workload estimates the physiological demand placed on the heart during circulation.",
             _fmt(cw_v, 1) if _has(cw_v) else "",
             "3.9–4.2",
             _eval_status("cardiac_workload", cw_v)),

            ("Heart Age",
             "Heart Age estimates cardiovascular system health relative to expected physiological age using multiple cardiac indicators.",
             f"{_fmt(ha_v,0)} yrs" if _has(ha_v) else "",
             "Match your age", ""),
        ]
        self._render_section("1 · Cardiovascular", rows_cardio)

        # ── SECTION 2: Respiratory ────────────────────────────────────────────
        rr_v   = getattr(s, "respiration_rate",  None)
        spo2_v = getattr(s, "oxygen_saturation", None)

        rows_resp = [
            ("Breathing Rate",
             "Breathing Rate reflects the number of respiratory cycles per minute during rest.",
             f"{_fmt(rr_v,0)} brpm" if _has(rr_v) else "",
             "12–20 brpm",
             _eval_status("respiration_rate", rr_v)),

            ("Oxygen Saturation (SpO2)",
             "Oxygen Saturation measures the percentage of oxygen carried by red blood cells throughout the body.",
             f"{_fmt(spo2_v,1)} %" if _has(spo2_v) else "",
             ">95%",
             _eval_status("oxygen_saturation", spo2_v)),
        ]
        self._render_section("2 · Respiratory", rows_resp)

        # ══ PAGE 2 ═══════════════════════════════════════════════════════════
        self._end_page()
        self._begin_page()

        # ── SECTION 3: HRV / Autonomic ────────────────────────────────────────
        sdnn_v   = getattr(s, "sdnn",      None)
        rmssd_v  = getattr(s, "rmssd",     None)
        mrri_v   = getattr(s, "mean_rri",  None)
        sd1_v    = getattr(s, "sd1",       None)
        sd2_v    = getattr(s, "sd2",       None)
        lfhf_v   = getattr(s, "lfhf",      None)
        prq_v    = getattr(s, "prq",       None)
        pns_idx  = getattr(s, "pns_index", None)
        pns_zone = getattr(s, "pns_zone",  None)
        sns_idx  = getattr(s, "sns_index", None)
        sns_zone = getattr(s, "sns_zone",  None)

        pns_lbl = _zone_label(pns_zone)
        sns_lbl = _zone_label(sns_zone)

        pns_val = " / ".join(filter(None, [_fmt(pns_idx,2) if _has(pns_idx) else "", pns_lbl]))
        sns_val = " / ".join(filter(None, [_fmt(sns_idx,2) if _has(sns_idx) else "", sns_lbl]))

        rows_hrv = [
            ("SDNN",
             "SDNN is a Heart Rate Variability metric reflecting overall autonomic nervous system adaptability and recovery capacity.",
             f"{_fmt(sdnn_v,1)} ms" if _has(sdnn_v) else "",
             ">=50 ms",
             _eval_status("sdnn", sdnn_v)),

            ("RMSSD",
             "RMSSD reflects short-term heart rate variability associated with parasympathetic nervous system activity and recovery state.",
             f"{_fmt(rmssd_v,1)} ms" if _has(rmssd_v) else "",
             "20–43 ms",
             _eval_status("rmssd", rmssd_v)),

            ("Mean RRI",
             "Mean RRi represents the average interval between consecutive heartbeats.",
             f"{_fmt(mrri_v,0)} ms" if _has(mrri_v) else "",
             "<1000 ms",
             _eval_status("mean_rri", mrri_v)),

            ("SD1",
             "SD1 reflects short-term beat-to-beat variability associated with autonomic regulation.",
             f"{_fmt(sd1_v,1)} ms" if _has(sd1_v) else "",
             ">10 ms",
             _eval_status("sd1", sd1_v)),

            ("SD2",
             "SD2 reflects long-term variability patterns associated with cardiovascular adaptability.",
             f"{_fmt(sd2_v,1)} ms" if _has(sd2_v) else "",
             ">20 ms",
             _eval_status("sd2", sd2_v)),

            ("LF/HF Ratio",
             "LF/HF Ratio reflects the balance between sympathetic and parasympathetic nervous system activity.",
             _fmt(lfhf_v,2) if _has(lfhf_v) else "",
             "0.5–2.0",
             _eval_status("lfhf", lfhf_v)),

            ("PRQ",
             "PRQ reflects the coordination efficiency between respiratory and cardiovascular activity.",
             _fmt(prq_v,1) if _has(prq_v) else "",
             "~5", ""),

            ("PNS Index / Zone",
             "PNS Index estimates parasympathetic nervous system activity associated with recovery and relaxation responses.",
             pns_val, "Normal zone", pns_lbl),

            ("SNS Index / Zone",
             "SNS Index estimates sympathetic nervous system activity associated with physiological stress response.",
             sns_val, "Normal zone", sns_lbl),
        ]
        self._render_section("3 · HRV & Autonomic Nervous System", rows_hrv)

        # ── SECTION 4: Stress & Wellness ──────────────────────────────────────
        sl_v   = getattr(s, "stress_level",            None)
        si_v   = getattr(s, "stress_index",            None)
        nsi_v  = getattr(s, "normalized_stress_index", None)
        wl_v   = getattr(s, "wellness_level",          None)
        wi_v   = getattr(s, "wellness_index",          None)

        sl_lbl = STRESS_LABEL.get(int(sl_v), "") if _has(sl_v) else ""
        wl_lbl = WELLNESS_LABEL.get(int(wl_v), "") if _has(wl_v) else ""

        rows_stress = [
            ("Stress Level",
             "Stress Level reflects autonomic nervous system activity and the body's physiological response to stress.",
             sl_lbl, "Low / Normal", sl_lbl),

            ("Stress Index (raw)",
             "Stress Index is a numerical representation of autonomic nervous system load and cardiovascular stress adaptation.",
             _fmt(si_v,0) if _has(si_v) else "",
             "<150",
             _eval_status("stress_index", si_v)),

            ("Normalised Stress Index",
             "Normalized Stress Index scales physiological stress measurements into a standardized percentage range.",
             f"{_fmt(nsi_v,0)}%" if _has(nsi_v) else "",
             "<40%",
             _eval_status("normalized_stress_index", nsi_v)),

            ("Wellness Level",
             "Wellness Level represents overall physiological balance derived from multiple cardiovascular indicators.",
             wl_lbl, "Normal / High", wl_lbl),

            ("Wellness Index",
             "Wellness Index is a composite physiological wellness indicator associated with cardiovascular balance and recovery efficiency.",
             _fmt(wi_v,1) if _has(wi_v) else "",
             ">6",
             _eval_status("wellness_index", wi_v)),
        ]
        self._render_section("4 · Stress & Wellness", rows_stress)

        # ══ PAGE 3 ═══════════════════════════════════════════════════════════
        self._end_page()
        self._begin_page()

        # ── SECTION 5: Metabolic & Bloodless Biomarkers ───────────────────────
        hba1c_v    = getattr(s, "hemoglobin_a1c",         None)
        hgb_v      = getattr(s, "hemoglobin",             None)
        hba1c_risk = _risk_label(getattr(s, "high_hemoglobin_a1c_risk", None))
        hgb_risk   = _risk_label(getattr(s, "low_hemoglobin_risk",      None))

        rows_meta = [
            ("Haemoglobin A1c (HbA1c)",
             "HbA1c reflects average blood glucose levels over the previous 2–3 months.",
             f"{_fmt(hba1c_v,1)}%" if _has(hba1c_v) else "",
             "<5.7%",
             hba1c_risk or _eval_status("hemoglobin_a1c", hba1c_v)),

            ("Haemoglobin",
             "Haemoglobin is responsible for transporting oxygen throughout the body.",
             f"{_fmt(hgb_v,1)} g/dL" if _has(hgb_v) else "",
             "M: 14–18 / F: 12–16 g/dL",
             hgb_risk or _eval_status("hemoglobin", hgb_v)),
        ]
        self._render_section("5 · Metabolic & Bloodless Biomarkers", rows_meta)

        # ── SECTION 6: Cardio-Metabolic Risk Scores ───────────────────────────
        def _risk_row(name, explanation, field, target="Low"):
            raw = getattr(s, field, None)
            lbl = _risk_label(raw)
            return (name, explanation, lbl, target, lbl)

        rows_risk = [
            _risk_row("High Blood Pressure Risk",
                      "Indicates whether measured blood pressure values exceed standard healthy thresholds.",
                      "high_blood_pressure_risk"),
            _risk_row("High HbA1c Risk",
                      "Indicates whether HbA1c values exceed standard glucose regulation thresholds.",
                      "high_hemoglobin_a1c_risk"),
            _risk_row("High Fasting Glucose Risk",
                      "Indicates whether fasting glucose values may exceed recommended healthy ranges.",
                      "high_fasting_glucose_risk"),
            _risk_row("High Total Cholesterol Risk",
                      "Indicates whether total cholesterol values may exceed recommended healthy ranges.",
                      "high_total_cholesterol_risk"),
            _risk_row("Low Haemoglobin Risk",
                      "Indicates whether haemoglobin levels may fall below recommended healthy ranges.",
                      "low_hemoglobin_risk"),
        ]
        self._render_section("6 · Cardio-Metabolic Risk Scores", rows_risk)

        # ── SECTION 7: ASCVD ──────────────────────────────────────────────────
        ascvd_v   = getattr(s, "ascvd_risk",       None)
        ascvd_lvl = _risk_label(getattr(s, "ascvd_risk_level", None))

        rows_ascvd = [
            ("ASCVD Risk Score",
             "ASCVD Risk estimates the likelihood of future cardiovascular events based on multiple physiological indicators.",
             f"{_fmt(ascvd_v,1)}%" if _has(ascvd_v) else "",
             "<10% (Low)",
             ascvd_lvl or _eval_status("ascvd_risk", ascvd_v)),

            ("ASCVD Risk Level",
             "ASCVD Risk Level categorizes cardiovascular risk into generalized severity groups.",
             ascvd_lvl, "Low", ascvd_lvl),

            ("Heart Age",
             "Heart Age estimates cardiovascular system health relative to expected physiological age.",
             f"{_fmt(ha_v,0)} yrs" if _has(ha_v) else "",
             "Match your age", ""),
        ]
        self._render_section("7 · ASCVD 10-Year Cardiovascular Risk", rows_ascvd)

        self.y -= 5 * mm
        self._notes_box()
        self._end_page()
        self.c.save()
        return self.buf.getvalue()


# ── Public entry point ────────────────────────────────────────────────────────

def build_scan_pdf(scan: Any, user_name: str, user_email: str,
                   logo_path: str = "") -> bytes:
    return ReportBuilder(scan, user_name, user_email, logo_path).build()


# ── Sample runner (full data) ─────────────────────────────────────────────────

class _SampleFull:
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


# ── Sample runner (partial data — missing fields skipped) ─────────────────────

class _SamplePartial:
    """Simulates a scan where several metrics were not captured."""
    id = "xyz99999"
    scanned_at = None
    pulse_rate = 88
    blood_pressure_systolic  = None   # not captured
    blood_pressure_diastolic = None
    pulse_pressure           = None
    mean_arterial_pressure   = 95
    cardiac_workload         = None
    heart_age                = 41
    respiration_rate         = 18
    oxygen_saturation        = 97.1
    sdnn        = 45.0            # below threshold → Low status
    rmssd       = None
    mean_rri    = 780
    sd1         = None
    sd2         = None
    lfhf        = 0.8
    prq         = None
    pns_index   = None
    pns_zone    = None
    sns_index   = 0.12
    sns_zone    = 2
    stress_index              = 180   # above threshold → High status
    stress_level              = 4
    normalized_stress_index   = None
    wellness_index            = 5.8
    wellness_level            = 2
    hemoglobin_a1c            = None
    hemoglobin                = 13.2
    ascvd_risk                = 8.5
    ascvd_risk_level          = 1
    high_blood_pressure_risk  = None
    high_hemoglobin_a1c_risk  = None
    low_hemoglobin_risk       = 1
    high_fasting_glucose_risk = None
    high_total_cholesterol_risk = 2


if __name__ == "__main__":
    import sys
    mode = sys.argv[1] if len(sys.argv) > 1 else "full"

    scan = _SamplePartial() if mode == "partial" else _SampleFull()
    label = "partial" if mode == "partial" else "full"

    pdf = build_scan_pdf(scan, "Alex Johnson", "alex.johnson@example.com", logo_path="")
    out = f"/mnt/user-data/outputs/mywellfie_report_v40_{label}.pdf"
    with open(out, "wb") as f:
        f.write(pdf)
    print(f"Saved [{label}] → {out}  ({len(pdf):,} bytes)")
