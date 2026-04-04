import os
import logging
from flask import Flask, jsonify
from config import Config
from extensions import db, migrate
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Configure logging — include module name for per-route tracing
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)


_REQUIRED_ENV_VARS = [
    "EMAIL_USER",
    "EMAIL_PASS",
    "BACKEND_URL",
    "FRONTEND_URL",
]

def _validate_env() -> None:
    """
    Validates all required environment variables are present.
    Raises EnvironmentError at startup if any are missing so the
    app fails fast rather than crashing mid-request.
    """
    missing = [key for key in _REQUIRED_ENV_VARS if not os.environ.get(key, '').strip()]
    if missing:
        msg = f"Missing required environment variables: {', '.join(missing)}"
        logger.error(f"[STARTUP] {msg}")
        raise EnvironmentError(msg)
    logger.info("[STARTUP] All required environment variables are present")

def create_app(config_class=Config):
    # Validate env vars before anything else — fail fast at startup
    _validate_env()

    # Log key startup env vars for production visibility
    logger.info("[STARTUP] BACKEND_URL=%s", os.environ.get('BACKEND_URL'))
    logger.info("[STARTUP] FRONTEND_URL=%s", os.environ.get('FRONTEND_URL'))

    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize DB
    db.init_app(app)
    migrate.init_app(app, db)

    # CORS — intentionally no supports_credentials so wildcard origin is valid.
    # Authorization header is passed explicitly and allowed via after_request.
    CORS(app, resources={r"/*": {"origins": "*"}})

    @app.after_request
    def add_cors_headers(response):
        """Ensure CORS headers are present on every response including errors."""
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
        return response

    # Rate limiting
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["1500 per day", "200 per hour"],
        storage_uri="memory://"
    )

    # Register blueprints
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

    # Catch-all OPTIONS handler — ensures browser preflight never gets a 404/405
    @app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
    @app.route('/<path:path>', methods=['OPTIONS'])
    def handle_options(path):
        return jsonify({}), 200

    # Health routes
    @app.route('/')
    def index():
        return jsonify({"message": "FocusPath Backend API Operational!"}), 200

    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy"}), 200

    # Global error handler
    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.error(f"Unhandled server exception: {e}", exc_info=True)
        if os.environ.get("FLASK_ENV") == "development":
            return jsonify({"error": str(e), "type": type(e).__name__}), 500
        return jsonify({"error": "Internal Server Error. Please try again later."}), 500

    logger.info("[STARTUP] Backend started successfully. All routes registered.")

    return app


if __name__ == '__main__':
    app = create_app()
    is_debug = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
    app.run(debug=is_debug, host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))