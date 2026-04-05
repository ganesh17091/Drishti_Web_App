import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def _fix_db_url(url: str) -> str:
    """
    Supabase / Heroku provide DATABASE_URL as postgresql:// or postgres://
    SQLAlchemy with psycopg3 requires postgresql+psycopg://
    """
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'super-secret-key-for-focuspath-dev'
    
    _raw_db_url = os.environ.get('DATABASE_URL') or 'sqlite:///focuspath.db'
    SQLALCHEMY_DATABASE_URI = _fix_db_url(_raw_db_url)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Required for Supabase connection pool (PgBouncer in transaction mode)
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "connect_args": {"connect_timeout": 10},
    }

    # Brevo HTTP Email API Configuration
    BREVO_API_KEY = os.environ.get('BREVO_API_KEY')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or 'pawarsanika963@gmail.com'
