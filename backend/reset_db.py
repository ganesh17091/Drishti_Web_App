from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Dropping all tables with CASCADE (including unknown dependents)...")
    with db.engine.connect() as conn:
        # Drop and recreate the public schema — cleanest possible reset for PostgreSQL
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        conn.commit()
    print("Schema wiped.")

    print("Recreating all tables from models...")
    db.create_all()
    print("✅ Database reset completed successfully!")
