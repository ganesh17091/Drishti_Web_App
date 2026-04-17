#!/usr/bin/env bash
set -e

echo "==> Running database migrations..."
flask db upgrade

echo "==> Database migrations complete. Starting gunicorn..."
exec gunicorn wsgi:app --bind "0.0.0.0:${PORT:-10000}" --workers 2 --timeout 120 --log-level info
