# WSGI entry point for production (Gunicorn / Railway / Render / Heroku)
# Gunicorn needs a module-level WSGI callable, not a factory function.
from app import create_app

app = create_app()
