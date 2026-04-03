# WSGI entry point for production (Gunicorn / Railway / Render / Heroku)
# Gunicorn needs a module-level WSGI callable, not a factory function.
from app import create_app, _validate_env

_validate_env()   # Fail hard at startup if any required env vars are missing
app = create_app()
