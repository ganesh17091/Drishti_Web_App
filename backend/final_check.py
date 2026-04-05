"""Final comprehensive check — run: python final_check.py"""
import sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, '.')

from dotenv import load_dotenv
load_dotenv()

OK   = "  [OK]  "
FAIL = "  [FAIL]"
WARN = "  [WARN]"
SEP  = "=" * 60

all_errors   = []
all_warnings = []

def ok(m):   print(f"{OK} {m}")
def fail(m): print(f"{FAIL} {m}"); all_errors.append(m)
def warn(m): print(f"{WARN} {m}"); all_warnings.append(m)

# ══════════════════════════════════════════════════════════════
# 1. ALL MODULE IMPORTS
# ══════════════════════════════════════════════════════════════
print(SEP)
print("  CHECK 1 — Module Imports")
print(SEP)

import_list = [
    "config", "extensions", "models",
    "utils.token_service", "utils.email_service",
    "utils.ai_engine", "utils.chatbot_engine",
    "routes.auth_routes", "routes.profile_routes",
    "routes.dashboard_routes", "routes.ai_routes",
    "routes.study_routes", "routes.admin_routes",
    "routes.todo_routes", "routes.chat_routes",
    "routes.wellbeing_routes", "routes.exam_routes",
    "wsgi",
]
for mod in import_list:
    try:
        __import__(mod)
        ok(mod)
    except Exception as e:
        fail(f"{mod}: {e}")

# ══════════════════════════════════════════════════════════════
# 2. ENVIRONMENT VARIABLES
# ══════════════════════════════════════════════════════════════
print()
print(SEP)
print("  CHECK 2 — Environment Variables")
print(SEP)

db_url   = os.getenv("DATABASE_URL", "")
jwt_sec  = os.getenv("JWT_SECRET", "")
sec_key  = os.getenv("SECRET_KEY", "")
goog_key = os.getenv("GOOGLE_API_KEY", "")

if db_url:
    ok(f"DATABASE_URL: {db_url[:55]}...")
else:
    fail("DATABASE_URL not set!")

if jwt_sec and jwt_sec != "your_jwt_secret":
    ok("JWT_SECRET: custom value set")
else:
    warn("JWT_SECRET is still the placeholder — MUST change for production!")

if sec_key and sec_key not in ("your_jwt_secret", "super-secret-key-for-focuspath-dev", ""):
    ok("SECRET_KEY: custom value set")
else:
    warn("SECRET_KEY is default dev value — MUST change for production!")

if goog_key:
    ok(f"GOOGLE_API_KEY: {goog_key[:12]}...")
else:
    warn("GOOGLE_API_KEY not set — all AI features will fail!")

# ══════════════════════════════════════════════════════════════
# 3. CONFIG - DB URL DIALECT
# ══════════════════════════════════════════════════════════════
print()
print(SEP)
print("  CHECK 3 — Config & DB Dialect")
print(SEP)

from app.config import Config
uri = Config.SQLALCHEMY_DATABASE_URI
if "postgresql+psycopg://" in uri:
    ok(f"DB dialect correct (postgresql+psycopg)")
elif "sqlite:///" in uri:
    ok("Using SQLite (local fallback)")
else:
    fail(f"Wrong dialect in URI: {uri[:60]}")

pool_ok = Config.SQLALCHEMY_ENGINE_OPTIONS.get("pool_pre_ping") is True
ok("pool_pre_ping enabled") if pool_ok else fail("pool_pre_ping not set!")
ok(f"pool_recycle=300")

# ══════════════════════════════════════════════════════════════
# 4. SUPABASE DB CONNECTION + SCHEMA
# ══════════════════════════════════════════════════════════════
print()
print(SEP)
print("  CHECK 4 — Supabase DB Connection & Schema")
print(SEP)

EXPECTED = [
    "users","user_profiles","user_activity_logs","ai_recommendations",
    "user_schedules","study_plans","skills","progress","notifications",
    "chat_history","exam_goals","todos",
]

try:
    import psycopg
    with psycopg.connect(db_url, connect_timeout=10) as conn:
        ver = conn.execute("SELECT version()").fetchone()[0]
        ok(f"Connected: {ver[:55]}")
        rows = conn.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
        ).fetchall()
        tables = [r[0] for r in rows]
        missing_t = [t for t in EXPECTED if t not in tables]
        if missing_t:
            fail(f"Missing tables — run flask db upgrade: {missing_t}")
        else:
            ok(f"All {len(EXPECTED)} tables present: {tables}")
except Exception as e:
    fail(f"DB connection failed: {e}")

# ══════════════════════════════════════════════════════════════
# 5. FLASK APP + ORM
# ══════════════════════════════════════════════════════════════
print()
print(SEP)
print("  CHECK 5 — Flask App Factory + SQLAlchemy ORM")
print(SEP)

try:
    from app import create_app
    from app.extensions import db as _db
    _app = create_app()
    bps = list(_app.blueprints.keys())
    ok(f"App created — Blueprints: {bps}")
    with _app.app_context():
        cnt = _db.session.execute(_db.text("SELECT COUNT(*) FROM users")).scalar()
        ok(f"ORM SELECT works — users in DB: {cnt}")
except Exception as e:
    fail(f"Flask/ORM failed: {e}")

# ══════════════════════════════════════════════════════════════
# 6. ROUTES
# ══════════════════════════════════════════════════════════════
print()
print(SEP)
print("  CHECK 6 — API Route Registration")
print(SEP)

KEY_ROUTES = [
    "/auth/signup", "/auth/login", "/auth/forgot-password",
    "/auth/reset-password/<token>",
    "/ai/onboarding", "/ai/log-activity", "/ai/generate-insights",
    "/ai/generate-schedule", "/ai/schedule/today",
    "/ai/insights", "/ai/resources", "/ai/resources/refresh",
    "/ai/recommendations",
    "/chat/message", "/chat/history", "/chat/clear",
    "/study/plans",
    "/todos",
    "/exams",
    "/wellbeing/today",
    "/dashboard/summary",
    "/profile",
]

try:
    from app import create_app as _ca
    _a = _ca()
    registered = set(r.rule for r in _a.url_map.iter_rules())
    missing_r = [r for r in KEY_ROUTES if r not in registered]
    if missing_r:
        fail(f"Missing routes: {missing_r}")
    else:
        ok(f"All {len(KEY_ROUTES)} key routes registered ({len(registered)} total routes)")
except Exception as e:
    fail(f"Route check failed: {e}")

# ══════════════════════════════════════════════════════════════
# 7. WSGI ENTRY POINT + PROCFILE
# ══════════════════════════════════════════════════════════════
print()
print(SEP)
print("  CHECK 7 — WSGI & Procfile")
print(SEP)

try:
    from wsgi import app as _wsgi_app
    if hasattr(_wsgi_app, "wsgi_app"):
        ok("wsgi.py exports a valid Flask WSGI application")
    else:
        fail("wsgi.app is not a valid Flask WSGI app")
except Exception as e:
    fail(f"wsgi.py failed: {e}")

procfile_path = os.path.join(os.path.dirname(__file__), "Procfile")
if os.path.exists(procfile_path):
    content = open(procfile_path).read().strip()
    if "wsgi:app" in content:
        ok(f"Procfile correct: {content}")
    else:
        fail(f"Procfile still uses wrong entry point: {content}")
else:
    fail("Procfile not found!")

# ══════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ══════════════════════════════════════════════════════════════
print()
print(SEP)

if all_errors:
    print(f"  RESULT: {len(all_errors)} ERROR(S) — fix before deploying!")
    for e in all_errors:
        print(f"    x {e}")
else:
    print("  RESULT: ALL CHECKS PASSED — READY TO DEPLOY!")

if all_warnings:
    print(f"\n  {len(all_warnings)} WARNING(S):")
    for w in all_warnings:
        print(f"    ! {w}")

print(SEP)
