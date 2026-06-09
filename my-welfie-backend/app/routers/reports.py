"""
Reports router — PDF generation and email delivery.

Endpoints
─────────
POST /reports/email-latest
    Email the most recent scan result to the authenticated user (or to an
    optional override address supplied in the request body).

POST /reports/email/{scan_result_id}
    Email a specific scan result (identified by UUID) to the authenticated user.

GET  /reports/download/{scan_result_id}
    Stream a specific scan result's PDF to the browser as a download.

Privacy & security controls
────────────────────────────
• All endpoints require a valid JWT (authenticated users only).
• Ownership is enforced: a user can only access their own scan results.
  Any attempt to access another user's scan returns 404 (not 403) to avoid
  leaking whether a scan ID exists.
• SMTP errors are caught and returned as 503 so callers can retry.
• Delivery is synchronous in this version.  For high volume, replace the
  send_report_email() call with a task-queue job (Celery / RQ / ARQ).
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.scan_result import ScanResult
from app.models.user import User
from app.schemas.report import EmailLatestReportRequest, EmailReportResponse
from app.services.mailer import send_report_email
from app.services.report_pdf import build_scan_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports"])


# ── helpers ────────────────────────────────────────────────────────────────────

def _get_owned_scan(
    scan_result_id: str,
    user: User,
    db: Session,
) -> ScanResult:
    """
    Return the ScanResult if it exists AND belongs to *user*.
    Returns 404 in both "not found" and "wrong owner" cases to avoid leaking IDs.
    """
    scan = db.query(ScanResult).filter(ScanResult.id == scan_result_id).first()
    if scan is None or scan.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan result not found",
        )
    return scan


def _resolve_email(request_override: str | None, user: User) -> str:
    """Return the target address: override if provided, otherwise account email."""
    return request_override if request_override else user.email


def _build_and_send(scan: ScanResult, to: str, user: User) -> EmailReportResponse:
    """Generate the PDF and send it; wrap SMTP errors cleanly."""
    display_name = user.full_name or user.email
    try:
        pdf_bytes = build_scan_pdf(scan, display_name, user.email, user_age=user.age)
    except Exception as exc:
        logger.exception("PDF generation failed for scan %s", scan.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF report",
        ) from exc

    try:
        send_report_email(
            to_address=to,
            user_name=display_name,
            pdf_bytes=pdf_bytes,
            scan_id=scan.id,
            scanned_at=scan.scanned_at,
        )
    except RuntimeError as exc:
        # SMTP not configured
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Email delivery failed for scan %s to %s", scan.id, to)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery failed. Please try again later.",
        ) from exc

    return EmailReportResponse(
        status="sent",
        to=to,
        scan_result_id=scan.id,
        sent_at=datetime.now(timezone.utc),
    )


# ── POST /reports/email-latest ─────────────────────────────────────────────────

@router.post(
    "/email-latest",
    response_model=EmailReportResponse,
    summary="Email the most recent health report",
)
def email_latest_report(
    body: EmailLatestReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Build a PDF from the authenticated user's most recent scan and send it
    to their registered email (or to *email_override* if provided).

    Returns 404 if the user has no scan results yet.
    Returns 503 if SMTP is not configured or delivery fails.
    """
    scan = (
        db.query(ScanResult)
        .filter(ScanResult.user_id == current_user.id)
        .order_by(ScanResult.scanned_at.desc())
        .first()
    )
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No scan results found for this account",
        )

    to = _resolve_email(body.email_override, current_user)
    logger.info("email-latest: user=%s to=%s scan=%s", current_user.id, to, scan.id[:8])
    return _build_and_send(scan, to, current_user)


# ── POST /reports/email/{scan_result_id} ──────────────────────────────────────

@router.post(
    "/email/{scan_result_id}",
    response_model=EmailReportResponse,
    summary="Email a specific health report by scan ID",
)
def email_specific_report(
    scan_result_id: str,
    body: EmailLatestReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Build a PDF from a specific scan result and email it.
    Ownership is enforced — users can only access their own scans.
    """
    scan = _get_owned_scan(scan_result_id, current_user, db)
    to = _resolve_email(body.email_override, current_user)
    logger.info("email-specific: user=%s to=%s scan=%s", current_user.id, to, scan.id[:8])
    return _build_and_send(scan, to, current_user)


# ── GET /reports/download/{scan_result_id} ────────────────────────────────────

@router.get(
    "/download/{scan_result_id}",
    summary="Download a health report PDF",
    response_class=Response,
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "PDF health report",
        },
        404: {"description": "Scan result not found"},
    },
)
def download_report(
    scan_result_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return the PDF for a specific scan as a binary download.
    Ownership is enforced — users can only download their own scans.
    """
    scan = _get_owned_scan(scan_result_id, current_user, db)
    display_name = current_user.full_name or current_user.email

    try:
        pdf_bytes = build_scan_pdf(
            scan, display_name, current_user.email, user_age=current_user.age,
        )
    except Exception as exc:
        logger.exception("PDF generation failed for scan %s", scan.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF report",
        ) from exc

    filename = f"wellfie-report-{scan.id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
