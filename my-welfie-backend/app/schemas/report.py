"""
Pydantic schemas for the report / email delivery endpoints.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class EmailLatestReportRequest(BaseModel):
    """
    Request body for POST /reports/email-latest.

    If email_override is provided, the report is sent there instead of the
    registered account email.  This is useful during testing or when a user
    wants a copy sent to a secondary address.
    """
    email_override: Optional[EmailStr] = None


class EmailReportResponse(BaseModel):
    """
    Confirmation payload returned after a report email is queued / sent.
    """
    status: str                   # "sent" | "queued"
    to: EmailStr                  # address the email was dispatched to
    scan_result_id: str           # UUID of the ScanResult that was included
    sent_at: datetime             # UTC timestamp of dispatch
