from app import create_app
from extensions import db
from sqlalchemy import text, MetaData

def reset_database(safe_mode=False):
    """
    Clears all data from the database.
    If safe_mode is True, it will only delete data via TRUNCATE without dropping tables.
    If False, it will drop all tables and recreate them.
    """
    app = create_app()
    with app.app_context():
        if safe_mode:
            print("Running in SAFE MODE: Truncating data without dropping tables...")
            with db.engine.connect() as conn:
                # Disable foreign key checks momentarily for SQLite, or handle CASCADE for PostgreSQL
                if db.engine.dialect.name == 'postgresql':
                    # Find all table names
                    meta = db.metadata
                    meta.reflect(bind=db.engine)
                    for table in reversed(meta.sorted_tables):
                        conn.execute(text(f'TRUNCATE TABLE "{table.name}" CASCADE;'))
                else:
                    # SQLite delete alternative
                    meta = db.metadata
                    meta.reflect(bind=db.engine)
                    for table in reversed(meta.sorted_tables):
                        conn.execute(text(f'DELETE FROM "{table.name}";'))
                conn.commit()
            print("✅ All user data deleted securely. Schema unchanged.")
        else:
            print("Running in STANDARD MODE: Dropping all tables...")
            db.drop_all()
            print("Recreating all tables...")
            db.create_all()
            print("✅ Database tables dropped and recreated successfully.")


if __name__ == "__main__":
    import sys
    mode = '--safe' in sys.argv
    reset_database(safe_mode=mode)
