import os
import logging
from flask import Flask, jsonify
from config import Config
from extensions import db, migrate, limiter
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# -------------------------------------------------------
# STARTUP ENV VALIDATION
# -------------------------------------------------------
_REQUIRED_ENV_VARS = {
    "EMAIL_USER":   "Gmail address used to send emails (e.g. you@gmail.com)",
    "EMAIL_PASS":   "Gmail App Password (myaccount.google.com → Security → App Passwords)",
    "BACKEND_URL":  "Deployed Flask API URL for verification email links",
    "FRONTEND_URL": "Deployed Next.js URL for reset email links + CORS",
    "SECRET_KEY":   "Flask secret key — generate with: python -c \"import secrets; print(secrets.token_hex(32))\"",
    "JWT_SECRET":   "JWT signing secret — generate with: python -c \"import secrets; print(secrets.token_hex(32))\"",
}


def _validate_env() -> None:
    """
    Validates that all required environment variables are present.
    Raises RuntimeError at startup if any are missing — prevents silent misconfiguration.
    """
    missing = [
        f"  {var}  →  {desc}"
        for var, desc in _REQUIRED_ENV_VARS.items()
        if not os.getenv(var, '').strip()
    ]
    if missing:
        msg = (
            "\n\n[STARTUP ERROR] Missing required environment variables:\n"
            + "\n".join(missing)
            + "\n\nCopy backend/.env.example to backend/.env and fill in all values.\n"
        )
        logger.error(msg)
        raise RuntimeError(msg)
    logger.info("Environment validation passed — all required variables are set.")


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # -------------------------------
    # DATABASE INIT
    # -------------------------------
    db.init_app(app)
    migrate.init_app(app, db)

    # -------------------------------
    # CORS FIX (IMPORTANT)
    # -------------------------------
    frontend_url = os.environ.get("FRONTEND_URL")

    if frontend_url:
        allowed_origins = [u.strip() for u in frontend_url.split(",")]
    else:
        # fallback for development
        allowed_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

    CORS(
        app,
        resources={r"/*": {"origins": allowed_origins}},
        supports_credentials=True
    )

    logger.info(f"CORS allowed origins: {allowed_origins}")

    # -------------------------------
    # RATE LIMITING
    # -------------------------------
    limiter.init_app(app)

    # -------------------------------
    # REGISTER BLUEPRINTS
    # -------------------------------
    from routes.auth_routes import auth_bp
    from routes.profile_routes import profile_bp
    from routes.dashboard_routes import dashboard_bp
    from routes.ai_routes import ai_bp
    from routes.study_routes import study_bp
    from routes.admin_routes import admin_bp
    from routes.todo_routes import todo_bp
    from routes.chat_routes import chat_bp
    from routes.wellbeing_routes import wellbeing_bp
    from routes.exam_routes import exam_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(study_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(todo_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(wellbeing_bp)
    app.register_blueprint(exam_bp)

    # -------------------------------
    # ROUTES
    # -------------------------------
    @app.route('/')
    def index():
        return jsonify({"message": "FocusPath Backend API Operational!"}), 200

    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy"}), 200

    # -------------------------------
    # GLOBAL ERROR HANDLER
    # -------------------------------
    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.error(f"Unhandled server exception: {e}", exc_info=True)

        if os.environ.get("FLASK_ENV") == "development":
            return jsonify({
                "error": str(e),
                "type": type(e).__name__
            }), 500

        return jsonify({
            "error": "Internal Server Error. Please try again later."
        }), 500

    return app


# -------------------------------
# LOCAL RUN
# -------------------------------
if __name__ == '__main__':
    _validate_env()          # Fail fast if env is incomplete
    app = create_app()
    is_debug = os.environ.get("FLASK_DEBUG", "False").lower() == "true"

    logger.info("Starting Flask app...")
    app.run(
        debug=is_debug,
        host='0.0.0.0',
        port=int(os.environ.get("PORT", 5000))
    )