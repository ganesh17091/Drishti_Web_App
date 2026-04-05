import os
import re

def update_imports(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements mapping for exact module paths that were moved
    replacements = [
        (r'from config import', r'from app.config import'),
        (r'import config', r'import app.config as config'),
        (r'from extensions import', r'from app.extensions import'),
        (r'import extensions', r'import app.extensions as extensions'),
        (r'from models import', r'from app.models import'),
        (r'import models', r'import app.models as models'),
        (r'from routes\.', r'from app.routes.'),
        (r'import routes', r'import app.routes as routes'),
        (r'from utils\.', r'from app.utils.'),
        (r'import utils', r'import app.utils as utils'),
        (r'from services\.', r'from app.services.'),
        (r'import services', r'import app.services as services'),
        (r'from app import create_app, _validate_env', r'from app import create_app\nfrom app.config import _validate_env'), # handle wsgi issues if needed
    ]

    new_content = content
    for old, new in replacements:
        new_content = re.sub(old, new, new_content)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated imports in {file_path}")

def main():
    root_dir = r"d:\Focuspath_APP\Focuspath_Web_App\backend"
    for dirpath, _, filenames in os.walk(root_dir):
        if 'venv' in dirpath or '__pycache__' in dirpath or 'migrations' in dirpath:
            continue
        for filename in filenames:
            if filename.endswith('.py'):
                file_path = os.path.join(dirpath, filename)
                # Ensure we don't mess up refactor_imports itself
                if 'refactor_imports.py' not in filename:
                    update_imports(file_path)

if __name__ == '__main__':
    main()
