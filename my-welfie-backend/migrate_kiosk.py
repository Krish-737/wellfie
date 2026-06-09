import re
from sqlalchemy import inspect, text

# ... (rest of your existing imports and helper functions like _add_columns go here)

def migrate_scan_results_nullable_user_id() -> None:
    """
    Make scan_results.user_id nullable for kiosk scans.
    SQLite does not support ALTER COLUMN — we recreate the table.
    Safe to run multiple times (checks if already done first).
    """
    inspector = inspect(engine)
    if "scan_results" not in inspector.get_table_names():
        return

    # Check if user_id is already nullable by inspecting the CREATE TABLE statement
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='scan_results'"
        )).fetchone()
        
        if result is None:
            return
            
        create_sql = result[0]
        
        # Find user_id column definition
        match = re.search(r'user_id\s+[^\n,)]+', create_sql, re.IGNORECASE)
        if match:
            col_def = match.group(0)
            if 'NOT NULL' not in col_def.upper():
                return  # Already nullable, skip
        else:
            return  # Column not found

        print('[migrate] Making scan_results.user_id nullable...')

        # Disable foreign key constraints temporarily to allow dropping/renaming tables safely
        conn.execute(text("PRAGMA foreign_keys = OFF"))

        try:
            # SQLite recreation approach: rename → create new → copy → drop old
            conn.execute(text("ALTER TABLE scan_results RENAME TO scan_results_old"))

            # Recreate without NOT NULL on user_id
            conn.execute(text("""
                CREATE TABLE scan_results (
                    id VARCHAR NOT NULL PRIMARY KEY,
                    user_id VARCHAR REFERENCES users(id),
                    scan_session_id VARCHAR REFERENCES scan_sessions(id),
                    kiosk_session_id VARCHAR REFERENCES kiosk_sessions(id),
                    scanned_at DATETIME,
                    created_at DATETIME,
                    updated_at DATETIME,
                    pulse_rate FLOAT,
                    blood_pressure_systolic FLOAT,
                    blood_pressure_diastolic FLOAT,
                    pulse_pressure FLOAT,
                    mean_arterial_pressure FLOAT,
                    cardiac_workload FLOAT,
                    heart_age FLOAT,
                    respiration_rate FLOAT,
                    oxygen_saturation FLOAT,
                    sdnn FLOAT,
                    rmssd FLOAT,
                    mean_rri FLOAT,
                    sd1 FLOAT,
                    sd2 FLOAT,
                    prq FLOAT,
                    lfhf FLOAT,
                    pns_index FLOAT,
                    pns_zone INTEGER,
                    sns_index FLOAT,
                    sns_zone INTEGER,
                    stress_level INTEGER,
                    stress_index FLOAT,
                    normalized_stress_index FLOAT,
                    wellness_level INTEGER,
                    wellness_index FLOAT,
                    hemoglobin FLOAT,
                    hemoglobin_a1c FLOAT,
                    high_hemoglobin_a1c_risk INTEGER,
                    high_blood_pressure_risk INTEGER,
                    high_fasting_glucose_risk INTEGER,
                    high_total_cholesterol_risk INTEGER,
                    low_hemoglobin_risk INTEGER,
                    ascvd_risk FLOAT,
                    ascvd_risk_level INTEGER,
                    measurement_duration_sec INTEGER,
                    scan_platform VARCHAR,
                    vitals_confidence JSON,
                    vitals_enabled JSON
                )
            """))

            # Copy all existing data (preserving existing kiosk_session_id values)
            conn.execute(text("""
                INSERT INTO scan_results
                SELECT 
                    id, user_id, scan_session_id, kiosk_session_id,
                    scanned_at, created_at, updated_at,
                    pulse_rate, blood_pressure_systolic, blood_pressure_diastolic,
                    pulse_pressure, mean_arterial_pressure, cardiac_workload, heart_age,
                    respiration_rate, oxygen_saturation,
                    sdnn, rmssd, mean_rri, sd1, sd2, prq, lfhf,
                    pns_index, pns_zone, sns_index, sns_zone,
                    stress_level, stress_index, normalized_stress_index,
                    wellness_level, wellness_index,
                    hemoglobin, hemoglobin_a1c,
                    high_hemoglobin_a1c_risk, high_blood_pressure_risk,
                    high_fasting_glucose_risk, high_total_cholesterol_risk,
                    low_hemoglobin_risk, ascvd_risk, ascvd_risk_level,
                    measurement_duration_sec, scan_platform,
                    vitals_confidence, vitals_enabled
                FROM scan_results_old
            """))

            conn.execute(text("DROP TABLE scan_results_old"))
            conn.commit()
            print('[migrate] scan_results.user_id is now nullable.')
            
        finally:
            # Re-enable foreign key constraints
            conn.execute(text("PRAGMA foreign_keys = ON"))


def migrate_profile_columns() -> None:
    _add_columns("users", USER_PROFILE_COLUMNS)
    _add_columns("users", USER_OAUTH_COLUMNS)
    _add_columns("scan_results", SCAN_RESULT_COLUMNS)
    _backfill_auth_provider()
    
    # Run the user_id nullability migration
    migrate_scan_results_nullable_user_id()