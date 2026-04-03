import os
import logging
from flask import Flask, jsonify
from config import Config
from extensions import db, migrate
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize DB
    db.init_app(app)
    migrate.init_app(app, db)

    # 🚀 TEMPORARY FIX: Allow all origins (fixes your current error)
    CORS(
        app,
        resources={r"/*": {"origins": "*"}},
        supports_credentials=True
    )

    # 🚀 CRITICAL: Handle preflight requests properly
    @app.after_request
    def add_headers(response):
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

    return app


if __name__ == '__main__':
    app = create_app()
    is_debug = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
    app.run(debug=is_debug, host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))