"""
FocusPath – Supabase DB Connection & Schema Checker
Run: python check_db.py
"""
import os
import sys

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("[!] python-dotenv not installed — reading from environment only")

db_url = os.getenv("DATABASE_URL", "")

print("=" * 60)
print("  FocusPath — Supabase DB Health Check")
print("=" * 60)

if not db_url:
    print("[FAIL] DATABASE_URL is not set in .env!")
    sys.exit(1)

print(f"[OK]  DATABASE_URL found: {db_url[:55]}...")
print()

# ── 1. Test psycopg connection ────────────────────────────────
print("[1] Testing raw psycopg connection to Supabase...")
try:
    import psycopg
except ImportError:
    print("[FAIL] psycopg not installed. Run: pip install psycopg[binary]")
    sys.exit(1)

try:
    with psycopg.connect(db_url, connect_timeout=10) as conn:
        cur = conn.execute("SELECT version()")
        version = cur.fetchone()[0]
        print(f"[OK]  Connected! PostgreSQL: {version[:65]}")
except Exception as e:
    print(f"[FAIL] Connection failed: {type(e).__name__}: {e}")
    sys.exit(1)

print()

# ── 2. Check tables ───────────────────────────────────────────
print("[2] Checking database schema tables...")
EXPECTED_TABLES = [
    "users",
    "user_profiles",
    "user_activity_logs",
    "ai_recommendations",
    "user_schedules",
    "study_plans",
    "skills",
    "progress",
    "notifications",
    "chat_history",
    "exam_goals",
    "todos",
]

try:
    with psycopg.connect(db_url, connect_timeout=10) as conn:
        cur = conn.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
        )
        existing_tables = [row[0] for row in cur.fetchall()]

    print(f"[OK]  Tables found ({len(existing_tables)}): {existing_tables}")
    print()

    missing = [t for t in EXPECTED_TABLES if t not in existing_tables]
    extra = [t for t in existing_tables if t not in EXPECTED_TABLES]

    if missing:
        print(f"[WARN] MISSING tables ({len(missing)}): {missing}")
        print("       Run: flask db upgrade  (inside backend/ folder with venv active)")
    else:
        print("[OK]  All 12 required tables are present in Supabase!")

    if extra:
        print(f"[INFO] Extra tables (not from FocusPath): {extra}")

except Exception as e:
    print(f"[FAIL] Schema check failed: {e}")
    sys.exit(1)

print()

# ── 3. Test SQLAlchemy ORM connection ─────────────────────────
print("[3] Testing via SQLAlchemy ORM (Flask app context)...")
try:
    from app import create_app
    from app.extensions import db

    app = create_app()
    with app.app_context():
        result = db.session.execute(db.text("SELECT COUNT(*) FROM users"))
        user_count = result.scalar()
        print(f"[OK]  SQLAlchemy ORM works! Users in DB: {user_count}")
except Exception as e:
    print(f"[FAIL] SQLAlchemy ORM test failed: {type(e).__name__}: {e}")

print()
print("=" * 60)
if not missing:
    print("  RESULT: DB is READY for deployment!")
else:
    print("  RESULT: DB needs migration — run flask db upgrade")
print("=" * 60)
