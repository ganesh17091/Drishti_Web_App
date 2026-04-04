import os
import logging
from flask import Flask, jsonify
from config import Config
from extensions import db, migrate
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

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

def _validate_env():
    missing = [key for key in _REQUIRED_ENV_VARS if not os.environ.get(key, '').strip()]
    if missing:
        raise EnvironmentError(f"Missing env vars: {', '.join(missing)}")

def create_app(config_class=Config):
    _validate_env()

    app = Flask(__name__)
    app.config.from_object(Config)

    # ✅ Initialize DB
    db.init_app(app)
    migrate.init_app(app, db)

    # ✅ FIXED CORS (ONLY THIS — remove manual headers)
    frontend_url = os.environ.get("FRONTEND_URL")

    CORS(
        app,
        origins=[frontend_url],
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"]
    )

    # ✅ Rate limiting
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["1500 per day", "200 per hour"],
        storage_uri="memory://"
    )

    # ✅ Register blueprints
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

    # ✅ Health routes
    @app.route('/')
    def index():
        return jsonify({"message": "FocusPath Backend API Operational!"}), 200

    @app.route('/health')
    def health_check():
        return jsonify({"status": "healthy"}), 200

    # ✅ Global error handler
    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.error(f"Error: {e}", exc_info=True)
        return jsonify({"error": "Internal Server Error"}), 500

    logger.info("Backend started successfully")

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))