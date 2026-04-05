from app import create_app
from app.extensions import db
from sqlalchemy import text

def clear_data():
    """SAFE RESET: delete all data only."""
    app = create_app()
    with app.app_context():
        # First ensure all metadata is loaded / reflected
        db.metadata.reflect(bind=db.engine)
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(table.delete())
        db.session.commit()
        print("✅ Data cleared successfully (schema preserved).")

def reset_database():
    """FULL RESET: drop and recreate all tables."""
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()
        print("✅ Database successfully dropped and recreated.")

if __name__ == "__main__":
    import sys
    if '--safe' in sys.argv:
        clear_data()
    else:
        reset_database()
