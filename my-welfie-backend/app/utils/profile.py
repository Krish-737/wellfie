"""Health profile validation, DOB parsing, and completeness checks."""

from datetime import date, datetime
from typing import Optional

VALID_SEX = {"male", "female", "unspecified"}
VALID_SMOKING = {"smoker", "non_smoker", "unspecified"}

# BioSense SDK scan ranges (errors 7007 / 7008 / 7012)
AGE_MIN, AGE_MAX = 18, 110
HEIGHT_MIN, HEIGHT_MAX = 130.0, 230.0
WEIGHT_MIN, WEIGHT_MAX = 40.0, 200.0


def parse_date_of_birth(value: str) -> date:
    """
    Parse DOB from DD/MM/YYYY (preferred) or YYYY-MM-DD (ISO fallback).
    """
    raw = value.strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    raise ValueError("date_of_birth must be DD/MM/YYYY (e.g. 20/05/1991)")


def format_date_of_birth(d: date) -> str:
    """Format stored date for API responses (DD/MM/YYYY)."""
    return d.strftime("%d/%m/%Y")


def age_from_dob(dob: date, today: Optional[date] = None) -> int:
    """Whole years between date of birth and today."""
    today = today or date.today()
    years = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        years -= 1
    return years


def validate_profile_fields(
    *,
    sex: Optional[str],
    age: Optional[int],
    height_cm: Optional[float],
    weight_kg: Optional[float],
    smoking_status: Optional[str],
    date_of_birth: Optional[date] = None,
) -> None:
    """Raise ValueError with a user-facing message if any field is invalid."""
    if sex is not None and sex not in VALID_SEX:
        raise ValueError(f"sex must be one of: {', '.join(sorted(VALID_SEX))}")
    if smoking_status is not None and smoking_status not in VALID_SMOKING:
        raise ValueError(f"smoking_status must be one of: {', '.join(sorted(VALID_SMOKING))}")
    if age is not None and not (AGE_MIN <= age <= AGE_MAX):
        raise ValueError(f"age must be between {AGE_MIN} and {AGE_MAX}")
    if height_cm is not None and not (HEIGHT_MIN <= height_cm <= HEIGHT_MAX):
        raise ValueError(f"height_cm must be between {HEIGHT_MIN} and {HEIGHT_MAX}")
    if weight_kg is not None and not (WEIGHT_MIN <= weight_kg <= WEIGHT_MAX):
        raise ValueError(f"weight_kg must be between {WEIGHT_MIN} and {WEIGHT_MAX}")
    if date_of_birth is not None:
        computed = age_from_dob(date_of_birth)
        if not (AGE_MIN <= computed <= AGE_MAX):
            raise ValueError(
                f"date_of_birth implies age {computed}; must be between {AGE_MIN} and {AGE_MAX}"
            )


def _fields_present(
    sex: Optional[str],
    age: Optional[int],
    height_cm: Optional[float],
    weight_kg: Optional[float],
) -> bool:
    return (
        sex in ("male", "female", "unspecified")
        and age is not None
        and height_cm is not None
        and weight_kg is not None
    )


def is_sdk_profile_ready(
    sex: Optional[str],
    age: Optional[int],
    height_cm: Optional[float],
    weight_kg: Optional[float],
) -> bool:
    """Profile values are set and within BioSense SDK limits for scanning."""
    if not _fields_present(sex, age, height_cm, weight_kg):
        return False
    return (
        AGE_MIN <= age <= AGE_MAX
        and HEIGHT_MIN <= height_cm <= HEIGHT_MAX
        and WEIGHT_MIN <= weight_kg <= WEIGHT_MAX
    )


def is_profile_complete(
    sex: Optional[str],
    age: Optional[int],
    height_cm: Optional[float],
    weight_kg: Optional[float],
) -> bool:
    """
    Profile is complete when required fields are set and SDK-ready for scans.
    """
    return is_sdk_profile_ready(sex, age, height_cm, weight_kg)
