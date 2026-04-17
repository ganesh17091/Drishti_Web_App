# WSGI entry point for production (Gunicorn / Railway / Render / Heroku)
# Gunicorn needs a module-level WSGI callable, not a factory function.
import logging
from flask_migrate import upgrade
from app import create_app

logger = logging.getLogger(__name__)

app = create_app()

# Run DB migrations automatically on startup so Render doesn't need a
# separate preDeployCommand or shell chaining (&&) in the Procfile.
with app.app_context():
    try:
        logger.info("[wsgi] Running flask db upgrade on startup...")
        upgrade()
        logger.info("[wsgi] DB migrations complete.")
    except Exception as e:
        logger.warning(f"[wsgi] DB migration skipped or failed (non-fatal): {e}")
