"""
My Wellfie — Health Scan PDF Report Generator  v3.0
=====================================================
Produces a clean, accurate, clinical-grade A4 PDF using all 34 scan fields.

Layout
------
  Page 1  : Header + Patient summary bar + Vital Signs overview cards
            + Cardiovascular section + Respiratory section
  Page 2  : HRV / Autonomic section + Stress & Wellness section
  Page 3  : Metabolic / Bloodless Biomarkers + Risk Scores + ASCVD
            + Scan Quality notes + Footer

Design rules
------------
  • Teal (#0f766e) brand colour throughout
  • Every nullable field renders "—" gracefully — never crashes
  • All enum values are mapped to human labels before display
  • Status pills colour-coded: green=good, amber=watch, red=act, grey=unknown
  • Interactive hyperlinks on "Learn more" text (opens in browser)
  • Logo loaded from disk if found, text fallback otherwise
  • Page numbers + disclaimer on every footer
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
W, H        = A4            # 595.28 x 841.89 pt
ML          = 18 * mm
MR          = 18 * mm
CW          = W - ML - MR   # usable content width
HEADER_H    = 44 * mm
FOOTER_H    = 16 * mm
TOP_Y       = H - HEADER_H  # y-cursor starts here after header

DEFAULT_LOGO_PATH = r"C:\Users\KishorekumarS\Downloads\my-welfie-2\my-welfie-2\my-welfie-backend\app\services\mywellfie-header-logo.png"

# ── Enum label maps ────────────────────────────────────────────────────────────
RISK_LABEL   = {None: "—", 0: "Unknown", 1: "Low", 2: "Medium", 3: "High"}
ZONE_LABEL   = {None: "—", 0: "Unknown", 1: "Low",  2: "Normal", 3: "High"}
STRESS_LABEL = {None: "—", 0: "Unknown", 1: "Very Low", 2: "Low",
                3: "Normal", 4: "High",  5: "Extreme"}
WELLNESS_LABEL = {None: "—", 0: "Unknown", 1: "Low", 2: "Normal", 3: "High"}

# ── Status → colour mapping ────────────────────────────────────────────────────
_GOOD    = {"Low", "Very Low", "Normal", "Optimal", "Healthy", "Good", "High (SpO2)"}
_WATCH   = {"Medium", "Moderate", "Elevated", "High (Stress)", "Low (HRV)"}
_BAD     = {"High", "Extreme", "Critical"}

def _pill_colors(label: str):
    """Return (bg, fg) for a status pill."""
    if label in _GOOD:
        return GREEN_BG, GREEN
    if label in _WATCH:
        return AMBER_BG, AMBER
    if label in _BAD:
        return RED_BG, RED
    return GREY_BG, SLATE_500

def _risk_pill(risk_int):
    """Map 0-3 risk integer → human label."""
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
    def __init__(self, scan: Any, user_name: str, user_email: str,
                 logo_path: str = DEFAULT_LOGO_PATH):
        self.scan       = scan
        self.user_name  = user_name
        self.user_email = user_email
        self.logo_path  = logo_path

        self.buf        = io.BytesIO()
        from reportlab.pdfgen import canvas as rl_canvas
        self.c          = rl_canvas.Canvas(self.buf, pagesize=A4)
        self.c.setTitle("My Wellfie — Digital Health Scan Report")
        self.page_num   = 1
        self.y          = TOP_Y   # current vertical cursor

        # Paragraph styles
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

    def _pill(self, x: float, y: float, label: str,
              w: float = 22 * mm, h: float = 4.5 * mm) -> None:
        """Draw a small rounded status pill."""
        bg, fg = _pill_colors(label)
        c = self.c
        c.setFillColor(bg)
        c.roundRect(x, y - 0.5 * mm, w, h, 1.5 * mm, fill=1, stroke=0)
        c.setFillColor(fg)
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(x + w / 2, y + 1.2 * mm, label)

    def _section_bar(self, title: str) -> None:
        """Full-width teal section heading bar; advances y."""
        bar_h = 7.5 * mm
        self._check_space(bar_h + 2 * mm)
        c = self.c
        c.setFillColor(TEAL)
        c.rect(ML, self.y - bar_h, CW, bar_h, fill=1, stroke=0)
        # left accent tab
        c.setFillColor(TEAL_MID)
        c.rect(ML, self.y - bar_h, 3 * mm, bar_h, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(ML + 5 * mm, self.y - bar_h + 2.5 * mm, title.upper())
        self.y -= bar_h

    def _h_line(self, alpha: float = 1.0) -> None:
        c = self.c
        c.setStrokeColor(SLATE_200)
        c.setLineWidth(0.4)
        c.line(ML, self.y, W - MR, self.y)

    def _check_space(self, needed: float) -> None:
        """If not enough vertical room, emit a new page."""
        if self.y - needed < FOOTER_H + 6 * mm:
            self._end_page()
            self._begin_page()

    # ── Page chrome ────────────────────────────────────────────────────────────

    def _draw_header(self) -> None:
        c = self.c
        scan = self.scan

        # Banner
        c.setFillColor(TEAL)
        c.rect(0, H - HEADER_H, W, HEADER_H, fill=1, stroke=0)

        # Logo or text fallback
        if self.logo_path and os.path.exists(self.logo_path):
            try:
                c.drawImage(self.logo_path, ML, H - 26 * mm,
                            width=38 * mm, height=13 * mm, mask="auto")
            except Exception:
                self._draw_brand_text()
        else:
            self._draw_brand_text()

        # Tagline
        c.setFillColor(TEAL_LIGHT)
        c.setFont("Helvetica", 8.5)
        c.drawString(ML, H - 33 * mm, "Digital Health Scan Report")

        # Right side — patient info cluster
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

        # Thin accent line
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
            "Consult a qualified healthcare professional."
        )
        c.drawCentredString(
            W / 2, FOOTER_H - 8 * mm,
            "Powered by BioSense Core Metrics Framework  ·  Confidential"
        )
        c.setFont("Helvetica", 7.5)
        c.setFillColor(SLATE_700)
        c.drawString(ML, FOOTER_H - 6 * mm, f"Page {self.page_num}")
        c.drawRightString(
            W - MR, FOOTER_H - 6 * mm,
            f"Generated: {datetime.utcnow().strftime('%d %b %Y %H:%M UTC')}"
        )

    def _begin_page(self) -> None:
        self._draw_header()
        self.y = TOP_Y - 4 * mm

    def _end_page(self) -> None:
        self._draw_footer()
        self.c.showPage()
        self.page_num += 1

    # ── Summary card row (4 big cards across top of page 1) ───────────────────

    def _draw_summary_cards(self) -> None:
        scan = self.scan
        cards = [
            ("PULSE RATE",
             f"{_fmt(scan.pulse_rate, 0)} bpm",
             RISK_LABEL.get(getattr(scan, "high_blood_pressure_risk", None), "—")),
            ("BLOOD PRESSURE",
             (f"{_fmt(scan.blood_pressure_systolic, 0)}/{_fmt(scan.blood_pressure_diastolic, 0)} mmHg"
              if scan.blood_pressure_systolic else "—"),
             _risk_pill(getattr(scan, "high_blood_pressure_risk", None))),
            ("SpO\u2082",
             f"{_fmt(scan.oxygen_saturation, 1)} %",
             "—"),
            ("STRESS",
             STRESS_LABEL.get(getattr(scan, "stress_level", None), "—"),
             STRESS_LABEL.get(getattr(scan, "stress_level", None), "—")),
        ]

        self._check_space(30 * mm)
        card_w = (CW - 3 * 3 * mm) / 4
        card_h = 26 * mm
        x = ML
        c = self.c

        for label, value, status in cards:
            # shadow
            c.setFillColor(SLATE_200)
            c.roundRect(x + 0.6 * mm, self.y - card_h - 0.6 * mm,
                        card_w, card_h, 2.5 * mm, fill=1, stroke=0)
            # card
            c.setFillColor(WHITE)
            c.roundRect(x, self.y - card_h, card_w, card_h, 2.5 * mm, fill=1, stroke=0)
            # teal top strip
            c.setFillColor(TEAL)
            c.roundRect(x, self.y - 4 * mm, card_w, 4 * mm, 2 * mm, fill=1, stroke=0)
            c.rect(x, self.y - 4 * mm, card_w, 2 * mm, fill=1, stroke=0)
            # label
            c.setFillColor(SLATE_500)
            c.setFont("Helvetica-Bold", 6.5)
            c.drawString(x + 2.5 * mm, self.y - 8 * mm, label)
            # value
            c.setFillColor(SLATE_900)
            c.setFont("Helvetica-Bold", 13)
            c.drawString(x + 2.5 * mm, self.y - 16 * mm, value)
            # status pill
            if status and status not in ("—", ""):
                self._pill(x + 2.5 * mm,
                           self.y - card_h + 2 * mm,
                           status, w=card_w - 5 * mm)
            x += card_w + 3 * mm

        self.y -= card_h + 5 * mm

    # ── Generic metric row ────────────────────────────────────────────────────
    # Each row: | Indicator name + description | Value | Target | Status pill |
    #           |<-- 68mm -->|<--- 30mm --->|<--- 30mm --->|<--- 38mm --->|

    COL_NAME  = ML
    COL_VAL   = ML + 69 * mm
    COL_TGT   = ML + 100 * mm
    COL_STAT  = ML + 131 * mm

    def _table_header(self) -> None:
        c = self.c
        hh = 5.5 * mm
        c.setFillColor(SLATE_100)
        c.rect(ML, self.y - hh, CW, hh, fill=1, stroke=0)
        c.setFillColor(SLATE_500)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(self.COL_NAME + 2 * mm,  self.y - 3.8 * mm, "INDICATOR")
        c.drawString(self.COL_VAL,             self.y - 3.8 * mm, "YOUR RESULT")
        c.drawString(self.COL_TGT,             self.y - 3.8 * mm, "TARGET RANGE")
        c.drawString(self.COL_STAT,            self.y - 3.8 * mm, "STATUS")
        self.y -= hh

    def _metric_row(self, name: str, description: str,
                    value: str, target: str,
                    status: str, link: str = "",
                    even: bool = True) -> None:
        """
        Draw one metric row. Auto-wraps description text and paginates.
        """
        c = self.c
        name_p  = Paragraph(f"<b>{name}</b>", self.st_label)
        desc_p  = Paragraph(description, self.st_desc)

        name_w, name_h = name_p.wrap(63 * mm, H)
        desc_w, desc_h = desc_p.wrap(63 * mm, H)
        row_h = name_h + desc_h + 5 * mm

        self._check_space(row_h)

        # Zebra background
        c.setFillColor(SLATE_50 if even else WHITE)
        c.rect(ML, self.y - row_h, CW, row_h, fill=1, stroke=0)

        # Left border accent
        c.setFillColor(TEAL_MID)
        c.rect(ML, self.y - row_h, 1.2 * mm, row_h, fill=1, stroke=0)

        # Name + description
        name_p.drawOn(c, self.COL_NAME + 2.5 * mm, self.y - name_h - 2 * mm)
        desc_p.drawOn(c, self.COL_NAME + 2.5 * mm, self.y - name_h - desc_h - 2 * mm)

        # Column dividers
        c.setStrokeColor(SLATE_200)
        c.setLineWidth(0.3)
        for x in (self.COL_VAL - 2 * mm,
                  self.COL_TGT - 2 * mm,
                  self.COL_STAT - 2 * mm):
            c.line(x, self.y, x, self.y - row_h)

        # Value
        c.setFillColor(SLATE_900)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(self.COL_VAL, self.y - name_h - 1 * mm, value)

        # Target
        c.setFillColor(SLATE_500)
        c.setFont("Helvetica", 8)
        c.drawString(self.COL_TGT, self.y - name_h - 1 * mm, target)

        # Status pill
        if status and status != "—":
            self._pill(self.COL_STAT, self.y - row_h + 1.5 * mm,
                       status, w=35 * mm, h=4.5 * mm)

        # Link
        if link:
            lx = self.COL_STAT
            ly = self.y - row_h + 7 * mm
            c.setFillColor(LINK_BLUE)
            c.setFont("Helvetica", 7)
            c.drawString(lx, ly, "Learn more \u2192")
            tw = c.stringWidth("Learn more \u2192", "Helvetica", 7)
            c.linkURL(link,
                      (lx, ly - 1.5, lx + tw + 2, ly + 6),
                      thickness=0, color=None)

        # Bottom border
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

        box_h = 52 * mm
        self._check_space(box_h + 4 * mm)
        c = self.c

        # Box background
        c.setFillColor(TEAL_PALE)
        c.roundRect(ML, self.y - box_h, CW, box_h, 3 * mm, fill=1, stroke=0)
        c.setStrokeColor(TEAL_MID)
        c.setLineWidth(0.5)
        c.roundRect(ML, self.y - box_h, CW, box_h, 3 * mm, fill=0, stroke=1)
        # Left teal bar
        c.setFillColor(TEAL)
        c.roundRect(ML, self.y - box_h, 2.5 * mm, box_h, 1.5 * mm, fill=1, stroke=0)

        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(ML + 5 * mm, self.y - 5 * mm, "SCAN QUALITY NOTES & COMPLIANCE INFORMATION")

        ny = self.y - 10 * mm
        for title, body in notes:
            p = Paragraph(f"<b>{title}:</b> {body}", self.st_note)
            _, ph = p.wrap(CW - 8 * mm, H)
            p.drawOn(c, ML + 5 * mm, ny - ph)
            ny -= ph + 3 * mm

        self.y -= box_h + 4 * mm

    # ── Main build method ─────────────────────────────────────────────────────

    def build(self) -> bytes:
        s = self.scan

        # ── PAGE 1 ─────────────────────────────────────────────────────────────
        self._begin_page()

        # Patient summary strip
        c = self.c
        c.setFillColor(TEAL_PALE)
        c.rect(ML, self.y - 9 * mm, CW, 9 * mm, fill=1, stroke=0)
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(ML + 3 * mm, self.y - 6 * mm, "HEALTH SCAN SUMMARY REPORT")
        c.setFillColor(SLATE_700)
        c.setFont("Helvetica", 8)
        scan_id = getattr(s, "id", "—")
        c.drawRightString(W - MR, self.y - 6 * mm,
                          f"Scan ID: {str(scan_id)[:8].upper() if scan_id != '—' else '—'}")
        self.y -= 9 * mm + 3 * mm

        # 4 summary cards
        self._draw_summary_cards()
        self.y -= 2 * mm

        # ── SECTION 1: Cardiovascular ─────────────────────────────────────────
        self._section_bar("1 · Cardiovascular")
        self._table_header()

        bp_val = (f"{_fmt(s.blood_pressure_systolic,0)} / {_fmt(s.blood_pressure_diastolic,0)}"
                  if s.blood_pressure_systolic else "—")
        bp_status = _risk_pill(getattr(s,"high_blood_pressure_risk",None))

        rows_cardio = [
            ("Heart Rate",
             "Resting heart beats per minute. Normal adults: 60–100 bpm.",
             f"{_fmt(s.pulse_rate,0)} bpm", "60–100 bpm", "—",
             "https://mywellfie.com/hr-info"),
            ("Blood Pressure",
             "Systolic (contraction) / Diastolic (rest) pressure. Stage 1 hypertension: ≥130/80.",
             bp_val, "<129/80 mmHg", bp_status,
             "https://mywellfie.com/bp-info"),
            ("Pulse Pressure",
             "Difference between systolic and diastolic. Elevated values suggest arterial stiffness.",
             f"{_fmt(s.pulse_pressure,0)} mmHg", "25–50 mmHg", "—",
             "https://mywellfie.com/pulse-pressure"),
            ("Mean Arterial Pressure",
             "Average perfusion pressure across one cardiac cycle. Critical for organ blood flow.",
             f"{_fmt(s.mean_arterial_pressure,0)} mmHg", "70–100 mmHg", "—",
             "https://mywellfie.com/map-info"),
            ("Cardiac Workload",
             "Approximates myocardial oxygen demand (Rate-Pressure Product proxy).",
             _fmt(s.cardiac_workload, 1), "3.9–4.2", "—",
             "https://mywellfie.com/workload-info"),
            ("Heart Age",
             "Framingham model estimate of vascular age vs. chronological age.",
             f"{_fmt(s.heart_age,0)} yrs", "Match your age", "—",
             "https://mywellfie.com/heartage-info"),
        ]
        for i, (nm, desc, val, tgt, st, lnk) in enumerate(rows_cardio):
            self._metric_row(nm, desc, val, tgt, st, lnk, even=(i%2==0))
        self.y -= 3 * mm

        # ── SECTION 2: Respiratory ────────────────────────────────────────────
        self._section_bar("2 · Respiratory")
        self._table_header()

        spo2_val = f"{_fmt(s.oxygen_saturation,1)} %"
        spo2_status = "High (SpO2)" if (s.oxygen_saturation or 0) >= 95 else "High"

        rows_resp = [
            ("Breathing Rate",
             "Respiratory cycles per minute at rest. Elevated rate may indicate stress or illness.",
             f"{_fmt(s.respiration_rate,0)} brpm", "12–20 brpm", "—",
             "https://mywellfie.com/respiration-info"),
            ("Oxygen Saturation (SpO\u2082)",
             "Percentage of haemoglobin carrying oxygen. Below 95% warrants clinical attention.",
             spo2_val, ">95%", spo2_status,
             "https://mywellfie.com/spo2-info"),
        ]
        for i, (nm, desc, val, tgt, st, lnk) in enumerate(rows_resp):
            self._metric_row(nm, desc, val, tgt, st, lnk, even=(i%2==0))
        self.y -= 3 * mm

        # ── PAGE 2 ─────────────────────────────────────────────────────────────
        self._end_page()
        self._begin_page()

        # ── SECTION 3: HRV / Autonomic ────────────────────────────────────────
        self._section_bar("3 · HRV & Autonomic Nervous System")
        self._table_header()

        pns_label = ZONE_LABEL.get(getattr(s,"pns_zone",None), "—")
        sns_label = ZONE_LABEL.get(getattr(s,"sns_zone",None), "—")

        rows_hrv = [
            ("SDNN",
             "Standard deviation of NN intervals — overall HRV. Low SDNN linked to cardiovascular risk.",
             f"{_fmt(s.sdnn,1)} ms", "≥50 ms", "Low (HRV)" if (s.sdnn or 999) < 50 else "Normal",
             "https://mywellfie.com/sdnn-info"),
            ("RMSSD",
             "Root mean square of successive RR differences — reflects parasympathetic (vagal) tone.",
             f"{_fmt(s.rmssd,1)} ms", "20–43 ms", "—",
             "https://mywellfie.com/rmssd-info"),
            ("Mean RRI",
             "Average R-R (inter-beat) interval. Longer values imply stronger parasympathetic activity.",
             f"{_fmt(s.mean_rri,0)} ms", "<1000 ms", "—",
             "https://mywellfie.com/rri-info"),
            ("SD1",
             "Poincare plot short-axis — immediate beat-to-beat variability (vagal modulation).",
             f"{_fmt(s.sd1,1)} ms", ">10 ms", "—",
             "https://mywellfie.com/sd1-info"),
            ("SD2",
             "Poincare plot long-axis — slower, longer-term HRV (sympatho-vagal balance).",
             f"{_fmt(s.sd2,1)} ms", ">20 ms", "—",
             "https://mywellfie.com/sd2-info"),
            ("LF/HF Ratio",
             "Ratio of low-frequency to high-frequency HRV power — sympatho-vagal balance index.",
             _fmt(s.lfhf, 2), "0.5–2.0", "—",
             "https://mywellfie.com/lfhf-info"),
            ("PRQ",
             "Pulse-Respiration Quotient — efficiency of heart-lung coordination.",
             _fmt(s.prq, 1), "~5", "—",
             "https://mywellfie.com/prq-info"),
            ("PNS Index / Zone",
             "Parasympathetic nervous system activity. Higher = more rest-and-digest tone.",
             f"{_fmt(s.pns_index,2)} / {pns_label}", "Normal zone", pns_label,
             "https://mywellfie.com/pns-info"),
            ("SNS Index / Zone",
             "Sympathetic nervous system activity. Elevated = fight-or-flight dominance.",
             f"{_fmt(s.sns_index,2)} / {sns_label}", "Normal zone", sns_label,
             "https://mywellfie.com/sns-info"),
        ]
        for i, (nm, desc, val, tgt, st, lnk) in enumerate(rows_hrv):
            self._metric_row(nm, desc, val, tgt, st, lnk, even=(i%2==0))
        self.y -= 3 * mm

        # ── SECTION 4: Stress & Wellness ──────────────────────────────────────
        self._section_bar("4 · Stress & Wellness")
        self._table_header()

        stress_label   = STRESS_LABEL.get(getattr(s,"stress_level",None), "—")
        wellness_label = WELLNESS_LABEL.get(getattr(s,"wellness_level",None), "—")

        rows_stress = [
            ("Stress Level",
             "Baevsky Stress Index classification. Reflects how the ANS handles homeostatic load.",
             stress_label, "Low / Normal",
             "High (Stress)" if stress_label in ("High","Extreme") else stress_label,
             "https://mywellfie.com/stress-labs"),
            ("Stress Index (raw)",
             "Non-negative mathematical index of sympathetic nervous system dominance.",
             _fmt(s.stress_index, 0), "<150", "—",
             "https://mywellfie.com/stress-index"),
            ("Normalised Stress Index",
             "Stress Index scaled to 0–100 for cross-session comparison.",
             f"{_fmt(s.normalized_stress_index,0)}%", "<40%", "—",
             "https://mywellfie.com/stress-normalized"),
            ("Wellness Level",
             "Overall cardiovascular wellness classification derived from combined vital signals.",
             wellness_label, "Normal / High", wellness_label,
             "https://mywellfie.com/wellness-info"),
            ("Wellness Index",
             "Numeric wellness score (Binah model) predicting 5–10 year cardiovascular risk.",
             _fmt(s.wellness_index, 1), ">6", "—",
             "https://mywellfie.com/wellness-index"),
        ]
        for i, (nm, desc, val, tgt, st, lnk) in enumerate(rows_stress):
            self._metric_row(nm, desc, val, tgt, st, lnk, even=(i%2==0))
        self.y -= 3 * mm

        # ── PAGE 3 ─────────────────────────────────────────────────────────────
        self._end_page()
        self._begin_page()

        # ── SECTION 5: Metabolic / Bloodless Biomarkers ───────────────────────
        self._section_bar("5 · Metabolic & Bloodless Biomarkers")
        self._table_header()

        hba1c_risk  = _risk_pill(getattr(s,"high_hemoglobin_a1c_risk",None))
        hgb_risk    = _risk_pill(getattr(s,"low_hemoglobin_risk",None))

        rows_meta = [
            ("Haemoglobin A1c (HbA1c)",
             "3-month average blood glucose proxy. Pre-diabetes: 5.7–6.4%. Diabetes: ≥6.5%.",
             f"{_fmt(s.hemoglobin_a1c,1)}%", "<5.7%", hba1c_risk,
             "https://mywellfie.com/hba1c-biomarker"),
            ("Haemoglobin",
             "Blood haemoglobin concentration. Low levels indicate anaemia risk.",
             f"{_fmt(s.hemoglobin,1)} g/dL", "M: 14–18 / F: 12–16 g/dL", hgb_risk,
             "https://mywellfie.com/hemoglobin-biomarker"),
        ]
        for i, (nm, desc, val, tgt, st, lnk) in enumerate(rows_meta):
            self._metric_row(nm, desc, val, tgt, st, lnk, even=(i%2==0))
        self.y -= 3 * mm

        # ── SECTION 6: Cardio-Metabolic Risk Scores ───────────────────────────
        self._section_bar("6 · Cardio-Metabolic Risk Scores")
        self._table_header()

        ascvd_level = _risk_pill(getattr(s,"ascvd_risk_level",None))

        rows_risk = [
            ("High Blood Pressure Risk",
             "Probability that systolic/diastolic readings exceed clinical hypertension threshold.",
             _risk_pill(getattr(s,"high_blood_pressure_risk",None)), "Low",
             _risk_pill(getattr(s,"high_blood_pressure_risk",None)),
             "https://mywellfie.com/hbp-info"),
            ("High HbA1c Risk",
             "Risk that HbA1c level exceeds 5.7% — early indicator of insulin resistance.",
             _risk_pill(getattr(s,"high_hemoglobin_a1c_risk",None)), "Low",
             _risk_pill(getattr(s,"high_hemoglobin_a1c_risk",None)),
             "https://mywellfie.com/hba1c-info"),
            ("High Fasting Glucose Risk",
             "Risk of impaired fasting glucose (≥100 mg/dL). Disregard if not fasting ≥8 hrs.",
             _risk_pill(getattr(s,"high_fasting_glucose_risk",None)), "Low",
             _risk_pill(getattr(s,"high_fasting_glucose_risk",None)),
             "https://mywellfie.com/glucose-info"),
            ("High Total Cholesterol Risk",
             "Risk of total cholesterol exceeding 200 mg/dL — cardiovascular disease marker.",
             _risk_pill(getattr(s,"high_total_cholesterol_risk",None)), "Low",
             _risk_pill(getattr(s,"high_total_cholesterol_risk",None)),
             "https://mywellfie.com/cholesterol-info"),
            ("Low Haemoglobin Risk",
             "Risk of haemoglobin dropping below normal — anaemia screening indicator.",
             _risk_pill(getattr(s,"low_hemoglobin_risk",None)), "Low",
             _risk_pill(getattr(s,"low_hemoglobin_risk",None)),
             "https://mywellfie.com/hemoglobin-info"),
        ]
        for i, (nm, desc, val, tgt, st, lnk) in enumerate(rows_risk):
            self._metric_row(nm, desc, val, tgt, st, lnk, even=(i%2==0))
        self.y -= 3 * mm

        # ── SECTION 7: ASCVD 10-Year Risk ────────────────────────────────────
        self._section_bar("7 · ASCVD 10-Year Cardiovascular Risk")
        self._table_header()

        rows_ascvd = [
            ("ASCVD Risk Score",
             "Framingham-based probability of an adverse cardiovascular event within 10 years.",
             f"{_fmt(s.ascvd_risk,1)}%", "<10% (Low)", ascvd_level,
             "https://mywellfie.com/ascvd-info"),
            ("ASCVD Risk Level",
             "Stratified risk category derived from the ASCVD percentage score.",
             ascvd_level, "Low", ascvd_level,
             "https://mywellfie.com/ascvd-info"),
            ("Heart Age",
             "Vascular age estimate vs. your chronological age using Framingham Heart Age model.",
             f"{_fmt(s.heart_age,0)} yrs", "Match your age", "—",
             "https://mywellfie.com/heartage-info"),
        ]
        for i, (nm, desc, val, tgt, st, lnk) in enumerate(rows_ascvd):
            self._metric_row(nm, desc, val, tgt, st, lnk, even=(i%2==0))
        self.y -= 5 * mm

        # ── Notes & Compliance box ────────────────────────────────────────────
        self._notes_box()

        # Commit
        self._end_page()
        self.c.save()
        return self.buf.getvalue()


# ── Public entry point (called by reports.py router) ─────────────────────────

def build_scan_pdf(
    scan: Any,
    user_name: str,
    user_email: str,
    logo_path: str = DEFAULT_LOGO_PATH,
) -> bytes:
    """
    Generate a full A4 health report PDF and return it as raw bytes.
    Called by routers/reports.py for both download and email delivery.
    """
    return ReportBuilder(scan, user_name, user_email, logo_path).build()