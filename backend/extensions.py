from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_mail import Mail

db = SQLAlchemy()
migrate = Migrate()
mail = Mail()
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
    default_limits=["1500 per day", "200 per hour"]
)
