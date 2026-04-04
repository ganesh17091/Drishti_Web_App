import os
import logging
from flask import Flask, jsonify, request
from config import Config
from extensions import db, migrate, limiter
from flask_cors import CORS

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
        logger.warning(f"Missing env vars: {', '.join(missing)}. App might lack functionality (e.g. email sending).")

def create_app(config_class=Config):
    _validate_env()

    app = Flask(__name__)
    app.config.from_object(config_class)

    # DB & Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Properly tie the globally used limiter to the current app 
    limiter.init_app(app)

    # CORS completely handled here - temporarily allowing all origins as requested
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        response.headers["Access-Control-Allow-Origin"] = origin if origin else "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
        return response

    @app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
    @app.route('/<path:path>', methods=['OPTIONS'])
    def handle_options(path):
        return '', 200

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

    @app.errorhandler(Exception)
    def handle_exception(e):
        return {
        "error": str(e),
        "type": type(e).__name__
    }, 500


    # Routes
    @app.route('/')
    def index():
        return jsonify({"message": "FocusPath Backend API Operational!"})

    @app.route('/health')
    def health_check():
        return jsonify({"status": "healthy"})

    @app.route('/test')
    def test_route():
        return jsonify({"message": "Backend working"})

    logger.info("Backend started successfully")

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))