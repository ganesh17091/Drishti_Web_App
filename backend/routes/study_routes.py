from flask import Blueprint, request, jsonify
from extensions import db
from models import StudyPlan
from utils.token_service import token_required
from datetime import datetime

study_bp = Blueprint('study', __name__, url_prefix='/study')

@study_bp.route('/plans', methods=['GET'])
@token_required
def get_plans(current_user):
    plans = StudyPlan.query.filter_by(user_id=current_user.id).order_by(StudyPlan.deadline).all()
    return jsonify([{
        'id': p.id,
        'task': p.task,
        'deadline': p.deadline.isoformat(),
        'allocated_hours': p.allocated_hours,
        'status': p.status
    } for p in plans]), 200

@study_bp.route('/plans', methods=['POST'])
@token_required
def create_plan(current_user):
    try:
        data = request.get_json()
        task = data.get('task')
        deadline_str = data.get('deadline')
        allocated_hours = float(data.get('allocated_hours', 1.0))

        if not task or not deadline_str:
            return jsonify({'error': 'Task and deadline are required.'}), 400

        # Support both 'YYYY-MM-DD' and full ISO datetime strings
        deadline = None
        for fmt, length in [('%Y-%m-%dT%H:%M:%S', 19), ('%Y-%m-%d', 10)]:
            try:
                deadline = datetime.strptime(deadline_str[:length], fmt)
                break
            except ValueError:
                continue
        if deadline is None:
            return jsonify({'error': 'Invalid deadline format. Use YYYY-MM-DD.'}), 400

        plan = StudyPlan(
            user_id=current_user.id,
            task=task,
            deadline=deadline,
            allocated_hours=allocated_hours,
            status='pending'
        )
        db.session.add(plan)
        db.session.commit()
        return jsonify({'message': 'Study plan created', 'id': plan.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@study_bp.route('/plans/<int:plan_id>/complete', methods=['POST'])
@token_required
def complete_plan(current_user, plan_id):
    try:
        plan = StudyPlan.query.filter_by(id=plan_id, user_id=current_user.id).first()
        if not plan:
            return jsonify({'error': 'Plan not found'}), 404
        plan.status = 'completed'
        db.session.commit()
        return jsonify({'message': 'Task marked as completed'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@study_bp.route('/plans/<int:plan_id>', methods=['DELETE'])
@token_required
def delete_plan(current_user, plan_id):
    try:
        plan = StudyPlan.query.filter_by(id=plan_id, user_id=current_user.id).first()
        if not plan:
            return jsonify({'error': 'Plan not found'}), 404
        db.session.delete(plan)
        db.session.commit()
        return jsonify({'message': 'Plan deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
