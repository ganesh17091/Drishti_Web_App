from flask import Blueprint, jsonify
from models import UserProfile, StudyPlan, Progress, UserActivityLog, UserSchedule
from utils.token_service import token_required
from datetime import date

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/dashboard')

@dashboard_bp.route('/summary', methods=['GET'])
@token_required
def summary(current_user):
    profile = UserProfile.query.filter_by(user_id=current_user.id).first()
    plans_pending = StudyPlan.query.filter_by(user_id=current_user.id, status='pending').count()
    plans_done = StudyPlan.query.filter_by(user_id=current_user.id, status='completed').count()
    recent_logs = UserActivityLog.query.filter_by(user_id=current_user.id)\
        .order_by(UserActivityLog.created_at.desc()).limit(5).all()
    today_schedule = UserSchedule.query.filter_by(
        user_id=current_user.id, schedule_date=date.today()).first()

    return jsonify({
        'has_profile': profile is not None,
        'pending_tasks': plans_pending,
        'completed_tasks': plans_done,
        'recent_activity': [{
            'type': l.activity_type,
            'description': l.description,
            'duration': l.duration_minutes
        } for l in recent_logs],
        'has_schedule_today': today_schedule is not None
    }), 200
