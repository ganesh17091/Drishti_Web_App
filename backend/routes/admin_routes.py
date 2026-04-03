from flask import Blueprint, request, jsonify
from extensions import db
from models import User, StudyPlan
from utils.token_service import token_required

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

def require_admin(f):
    """Decorator: validates JWT token AND checks user.role == 'admin'"""
    from functools import wraps
    @wraps(f)
    @token_required
    def decorated(current_user, *args, **kwargs):
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required.'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

@admin_bp.route('/', methods=['GET'])
@require_admin
def dashboard(current_user):
    users = User.query.filter_by(role='student').all()
    total_tasks = StudyPlan.query.count()
    completed_tasks = StudyPlan.query.filter_by(status='completed').count()

    return jsonify({
        'total_users': len(users),
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'users': [
            {
                'id': u.id,
                'name': u.name,
                'email': u.email,
                'is_verified': u.is_verified,
                'created_at': u.created_at.isoformat()
            }
            for u in users
        ]
    }), 200
