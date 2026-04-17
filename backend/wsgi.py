# WSGI entry point for production (Gunicorn / Railway / Render / Heroku)
# Gunicorn needs a module-level WSGI callable, not a factory function.
import sys
import logging
from flask_migrate import upgrade
from app import create_app

logger = logging.getLogger(__name__)

app = create_app()

# Run DB migrations automatically on startup.
# Guard with a Postgres advisory lock so only ONE Gunicorn worker executes
# the migration even when multiple workers import this module concurrently.
with app.app_context():
    from app.extensions import db
    from sqlalchemy import text

    try:
        # Acquire an exclusive session-level advisory lock (any stable integer key).
        # Other workers will block here until the lock is released at session end.
        MIGRATION_LOCK_KEY = 7483920  # arbitrary stable integer for this app
        logger.info("[wsgi] Acquiring advisory lock for migrations...")
        db.session.execute(text(f"SELECT pg_advisory_lock({MIGRATION_LOCK_KEY})"))

        try:
            logger.info("[wsgi] Running flask db upgrade on startup...")
            upgrade()
            logger.info("[wsgi] DB migrations complete.")
        finally:
            # Always release so other workers can proceed.
            db.session.execute(text(f"SELECT pg_advisory_unlock({MIGRATION_LOCK_KEY})"))
            db.session.commit()

    except SystemExit:
        raise  # allow sys.exit() through
    except Exception as e:
        err_msg = str(e).lower()
        # Treat "already up-to-date" or alembic no-op messages as benign.
        if "up-to-date" in err_msg or "no changes" in err_msg or "will assume" in err_msg:
            logger.info(f"[wsgi] DB already up-to-date, skipping: {e}")
        else:
            # Real migration failure — log full traceback and abort startup.
            logger.exception(f"[wsgi] FATAL: DB migration failed, aborting startup: {e}")
            sys.exit(1)
