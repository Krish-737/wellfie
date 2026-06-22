"""
SMTP email sender for My Wellfie.

send_report_email() builds a multipart MIME message containing:
  - an HTML body with a brief health summary
  - the full PDF report as an inline attachment

Transport security
──────────────────
The function connects via SMTP_HOST:SMTP_PORT using STARTTLS (port 587,
the RFC-recommended submission port).  For Gmail you must generate an
App Password — never use your primary account password.

Configuration (all read from .env via app/config.py):
  SMTP_HOST        default: smtp.gmail.com
  SMTP_PORT        default: 587
  SMTP_USER        your sending account
  SMTP_PASSWORD    App Password (Gmail) or equivalent
  EMAIL_FROM       "From:" address shown to recipients
"""

from __future__ import annotations

import logging
import smtplib
from datetime import datetime, timezone
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import EMAIL_FROM, FRONTEND_URL, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USER

logger = logging.getLogger(__name__)


def _html_body(user_name: str, scanned_at: datetime | None, scan_id: str) -> str:
    scanned_str = (
        scanned_at.strftime("%d %b %Y at %H:%M UTC") if scanned_at else "recently"
    )
    logo_url = f"{FRONTEND_URL.rstrip('/')}/icons/apple-touch-icon.png"
    return f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;
              box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden">
    <div style="background:#0f766e;padding:20px 28px;display:flex;align-items:center;gap:14px">
      <img src="{logo_url}" alt="My Wellfie" width="52" height="52"
           style="border-radius:10px;display:block;flex-shrink:0"
           onerror="this.style.display='none'" />
      <div>
        <h1 style="color:#fff;margin:0;font-size:22px;line-height:1">My Wellfie</h1>
        <p style="color:#ccfbf1;margin:4px 0 0;font-size:13px">Personal Health Report</p>
      </div>
    </div>
    <div style="padding:28px">
      <p style="color:#0f172a;font-size:15px">Hi <strong>{user_name}</strong>,</p>
      <p style="color:#334155;font-size:14px;line-height:1.7">
        Your health scan completed on <strong>{scanned_str}</strong> has been
        processed.  Please find your full report attached as a PDF (scan ID:
        <code style="background:#f1f5f9;padding:2px 5px;border-radius:4px;font-size:12px">{scan_id[:8]}</code>).
      </p>
      <p style="color:#334155;font-size:14px;line-height:1.7">
        The report includes all measured indicators across seven health
        categories: cardiovascular, respiratory, HRV / autonomic nervous system,
        stress &amp; wellness, metabolic/blood, and cardio-metabolic risk scores.
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
      <p style="color:#94a3b8;font-size:12px;line-height:1.6">
        <strong>Important:</strong> This report is for informational purposes only
        and does not constitute medical advice.  Please consult a qualified
        healthcare professional for clinical interpretation of your results.
      </p>
    </div>
    <div style="background:#f8fafc;padding:14px 28px;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0">
        © {datetime.now().year} My Wellfie &nbsp;·&nbsp; You are receiving this
        because you requested a health report.
      </p>
    </div>
  </div>
</body>
</html>
""".strip()


def send_report_email(
    to_address: str,
    user_name: str,
    pdf_bytes: bytes,
    scan_id: str,
    scanned_at: datetime | None = None,
) -> None:
    """
    Send a health-report PDF to *to_address* via SMTP.

    Raises
    ------
    RuntimeError
        If SMTP credentials are not configured in .env.
    smtplib.SMTPException
        If the SMTP transaction fails (wrong password, network error, etc.).
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        raise RuntimeError(
            "SMTP is not configured. Add SMTP_USER and SMTP_PASSWORD to your .env file."
        )

    # ── Build MIME message ────────────────────────────────────────────────────
    msg = MIMEMultipart("mixed")
    msg["Subject"] = "Your My Wellfie Health Report"
    msg["From"] = f"My Wellfie <{EMAIL_FROM}>"
    msg["To"] = to_address

    # HTML body part
    html_part = MIMEText(_html_body(user_name, scanned_at, scan_id), "html", "utf-8")
    msg.attach(html_part)

    # PDF attachment
    pdf_part = MIMEBase("application", "pdf")
    pdf_part.set_payload(pdf_bytes)
    encoders.encode_base64(pdf_part)
    filename = f"wellfie-report-{scan_id[:8]}.pdf"
    pdf_part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
    pdf_part.add_header("Content-Type", "application/pdf", name=filename)
    msg.attach(pdf_part)

    # ── SMTP handshake ────────────────────────────────────────────────────────
    logger.info("Sending health report to %s (scan %s)", to_address, scan_id[:8])
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(EMAIL_FROM, [to_address], msg.as_string())

    logger.info("Health report delivered to %s", to_address)
