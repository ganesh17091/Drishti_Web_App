"""
FocusPath — Full System Health Check
Run: python full_check.py
"""
import sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, '.')

PASS = "[OK]  "
FAIL = "[FAIL]"
WARN = "[WARN]"
SEP  = "=" * 60

errors = []
warnings = []

def ok(msg):   print(f"  {PASS} {msg}")
def fail(msg): print(f"  {FAIL} {msg}"); errors.append(msg)
def warn(msg): print(f"  {WARN} {msg}"); warnings.append(msg)

# ─── 1. IMPORTS ──────────────────────────────────────────────
print(SEP)
print("  [1] Module Import Check")
print(SEP)

MODULES = [
    ("config",                  ["Config"]),
    ("extensions",              ["db", "migrate"]),
    ("models",                  ["User","UserProfile","StudyPlan","Todo",
                                  "ChatHistory","ExamGoal","UserActivityLog",
                                  "AIRecommendation","UserSchedule","Progress",
                                  "Notification","Skill"]),
    ("utils.token_service",     ["generate_jwt","decode_jwt","token_required"]),
    ("utils.email_service",     ["send_verification_email","send_reset_email"]),
    ("utils.ai_engine",         ["analyze_user","generate_daily_schedule",
                                  "generate_recommendations","generate_resource_links"]),
    ("utils.chatbot_engine",    ["generate_chat_response"]),
    ("routes.auth_routes",      ["auth_bp"]),
    ("routes.profile_routes",   ["profile_bp"]),
    ("routes.dashboard_routes", ["dashboard_bp"]),
    ("routes.ai_routes",        ["ai_bp"]),
    ("routes.study_routes",     ["study_bp"]),
    ("routes.admin_routes",     ["admin_bp"]),
    ("routes.todo_routes",      ["todo_bp"]),
    ("routes.chat_routes",      ["chat_bp"]),
    ("routes.wellbeing_routes", ["wellbeing_bp"]),
    ("routes.exam_routes",      ["exam_bp"]),
    ("wsgi",                    ["app"]),
]

for mod, names in MODULES:
    try:
        m = __import__(mod, fromlist=names)
        missing = [n for n in names if not hasattr(m, n)]
        if missing:
            fail(f"{mod} — missing attrs: {missing}")
        else:
            ok(mod)
    except Exception as e:
        fail(f"{mod}: {e}")

# ─── 2. CONFIG CHECK ─────────────────────────────────────────
print()
print(SEP)
print("  [2] Config & Environment Check")
print(SEP)

from dotenv import load_dotenv
load_dotenv()

db_url = os.getenv("DATABASE_URL", "")
jwt_secret = os.getenv("JWT_SECRET", "")
secret_key = os.getenv("SECRET_KEY", "")
google_key = os.getenv("GOOGLE_API_KEY", "")

if db_url:
    ok(f"DATABASE_URL: {db_url[:55]}...")
else:
    fail("DATABASE_URL not set!")

if jwt_secret and jwt_secret != "your_jwt_secret":
    ok("JWT_SECRET: set")
else:
    warn("JWT_SECRET is placeholder ('your_jwt_secret') — change before production!")

if secret_key and secret_key not in ("your_jwt_secret", "super-secret-key-for-focuspath-dev"):
    ok("SECRET_KEY: set")
else:
    warn("SECRET_KEY is using default dev value — change before production!")

if google_key:
    ok(f"GOOGLE_API_KEY: {google_key[:12]}...")
else:
    warn("GOOGLE_API_KEY not set — AI features will fail!")

# Check DATABASE_URL dialect fix
from config import Config
db_uri = Config.SQLALCHEMY_DATABASE_URI
if "postgresql+psycopg://" in db_uri or "sqlite:///" in db_uri:
    ok(f"DB dialect correct: {db_uri[:55]}...")
else:
    fail(f"DB dialect wrong — expected postgresql+psycopg://, got: {db_uri[:55]}")

# ─── 3. DB CONNECTION ─────────────────────────────────────────
print()
print(SEP)
print("  [3] Supabase DB Connection")
print(SEP)

EXPECTED_TABLES = [
    "users","user_profiles","user_activity_logs","ai_recommendations",
    "user_schedules","study_plans","skills","progress","notifications",
    "chat_history","exam_goals","todos",
]

try:
    import psycopg
    with psycopg.connect(db_url, connect_timeout=10) as conn:
        ver = conn.execute("SELECT version()").fetchone()[0]
        ok(f"Connected: {ver[:55]}")
        tables = [r[0] for r in conn.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
        ).fetchall()]
        missing_tables = [t for t in EXPECTED_TABLES if t not in tables]
        if missing_tables:
            fail(f"Missing tables: {missing_tables} — run: flask db upgrade")
        else:
            ok(f"All {len(EXPECTED_TABLES)} tables present")
except Exception as e:
    fail(f"DB connection failed: {e}")

# ─── 4. ORM + FLASK APP ───────────────────────────────────────
print()
print(SEP)
print("  [4] Flask App + SQLAlchemy ORM")
print(SEP)

try:
    from app import create_app
    from extensions import db as _db
    _app = create_app()
    bps = list(_app.blueprints.keys())
    ok(f"Flask app created — blueprints: {bps}")
    with _app.app_context():
        count = _db.session.execute(_db.text("SELECT COUNT(*) FROM users")).scalar()
        ok(f"ORM query works — users in DB: {count}")
except Exception as e:
    fail(f"Flask app/ORM failed: {e}")

# ─── 5. WSGI ENTRY POINT ──────────────────────────────────────
print()
print(SEP)
print("  [5] WSGI / Gunicorn Entry Point")
print(SEP)

try:
    from wsgi import app as wsgi_app
    if hasattr(wsgi_app, 'wsgi_app'):
        ok("wsgi.py exports a valid Flask WSGI app")
    else:
        fail("wsgi.app is not a valid WSGI app")
except Exception as e:
    fail(f"wsgi.py failed: {e}")

# ─── 6. ROUTE URL MAP ────────────────────────────────────────
print()
print(SEP)
print("  [6] API Route Registration Check")
print(SEP)

try:
    from app import create_app as _ca
    _a = _ca()
    routes = sorted(set(r.rule for r in _a.url_map.iter_rules()))
    key_routes = [
        "/auth/signup", "/auth/login", "/auth/forgot-password",
        "/ai/onboarding", "/ai/log-activity", "/ai/generate-insights",
        "/ai/generate-schedule", "/ai/schedule/today", "/ai/insights",
        "/ai/resources", "/ai/resources/refresh", "/ai/recommendations",
        "/chat/message", "/chat/history", "/chat/clear",
        "/study/plans", "/todos", "/exams",
        "/wellbeing/today", "/dashboard/summary", "/profile",
    ]
    missing_routes = [r for r in key_routes if r not in routes]
    if missing_routes:
        fail(f"Missing routes: {missing_routes}")
    else:
        ok(f"All {len(key_routes)} key API routes registered ({len(routes)} total)")
except Exception as e:
    fail(f"Route check failed: {e}")

# ─── SUMMARY ─────────────────────────────────────────────────
print()
print(SEP)
if errors:
    print(f"  RESULT: {len(errors)} ERROR(S) found — fix before deploying!")
    for e in errors:
        print(f"    ✗ {e}")
else:
    print(f"  RESULT: ALL CHECKS PASSED!")

if warnings:
    print(f"\n  {len(warnings)} WARNING(S):")
    for w in warnings:
        print(f"    ⚠ {w}")
print(SEP)
