"""
Lightweight schema migrations for development SQLite/PostgreSQL.

SQLAlchemy create_all() does not add columns to existing tables. This module
adds new columns when the server starts.
"""

from typing import List, Tuple

from sqlalchemy import inspect, text
from app.database import engine


USER_PROFILE_COLUMNS = [
    ("sex", "VARCHAR"),
    ("age", "INTEGER"),
    ("height_cm", "FLOAT"),
    ("weight_kg", "FLOAT"),
    ("smoking_status", "VARCHAR"),
    ("date_of_birth", "DATE"),
]

USER_OAUTH_COLUMNS = [
    ("auth_provider", "VARCHAR"),
    ("provider_subject", "VARCHAR"),
    ("avatar_url", "VARCHAR"),
]

SCAN_RESULT_COLUMNS = [
    ("created_at", "DATETIME"),
    ("updated_at", "DATETIME"),
    ("measurement_duration_sec", "INTEGER"),
    ("scan_platform", "VARCHAR"),
    ("vitals_confidence", "TEXT"),
    ("vitals_enabled", "TEXT"),
]


def _add_columns(table: str, columns: List[Tuple[str, str]]) -> None:
    inspector = inspect(engine)
    if table not in inspector.get_table_names():
        return

    existing = {c["name"] for c in inspector.get_columns(table)}

    with engine.begin() as conn:
        for name, col_type in columns:
            if name in existing:
                continue
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {col_type}"))


def migrate_profile_columns() -> None:
    _add_columns("users", USER_PROFILE_COLUMNS)
    _add_columns("users", USER_OAUTH_COLUMNS)
    _add_columns("scan_results", SCAN_RESULT_COLUMNS)
    _backfill_auth_provider()


def _backfill_auth_provider() -> None:
    """Existing email users before OAuth shipped."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    existing = {c["name"] for c in inspector.get_columns("users")}
    if "auth_provider" not in existing:
        return
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE users SET auth_provider = 'email' WHERE auth_provider IS NULL")
        )
