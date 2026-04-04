import os
import logging
from flask import Flask, jsonify, request
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

    # DB
    db.init_app(app)
    migrate.init_app(app, db)

    # CORS
    frontend_url = os.environ.get("FRONTEND_URL")
    CORS(app, resources={r"/*": {"origins": "*"}})
    

    # ✅ FIX: preflight handler INSIDE create_app
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = app.make_default_options_response()
            headers = response.headers

            headers["Access-Control-Allow-Origin"] = frontend_url
            headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"

            return response

    # Rate limiter
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["1500 per day", "200 per hour"],
        storage_uri="memory://"
    )

    # Blueprints
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

    # Routes
    @app.route('/')
    def index():
        return jsonify({"message": "FocusPath Backend API Operational!"})

    @app.route('/health')
    def health_check():
        return jsonify({"status": "healthy"})

    logger.info("Backend started successfully")

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))