from flask import Blueprint, request, jsonify
from extensions import db
from models import UserProfile, User
from utils.token_service import token_required

profile_bp = Blueprint('profile', __name__, url_prefix='/profile')

@profile_bp.route('', methods=['GET'])
@token_required
def get_profile(current_user):
    profile = UserProfile.query.filter_by(user_id=current_user.id).first()
    user = db.session.get(User, current_user.id)
    return jsonify({
        'name': user.name,
        'email': user.email,
        'college': user.college,
        'branch': user.branch,
        'age': profile.age if profile else None,
        'current_role': profile.current_role if profile else None,
        'goals': profile.goals if profile else None,
        'interests': profile.interests if profile else None,
        'daily_available_hours': profile.daily_available_hours if profile else None,
    }), 200

@profile_bp.route('', methods=['PUT'])
@token_required
def update_profile(current_user):
    try:
        data = request.get_json()
        user = db.session.get(User, current_user.id)
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()

        if not profile:
            profile = UserProfile(user_id=current_user.id)
            db.session.add(profile)

        # Update user table fields
        if 'name' in data: user.name = data['name']
        if 'college' in data: user.college = data['college']
        if 'branch' in data: user.branch = data['branch']

        # Update AI profile fields
        if 'age' in data: profile.age = data['age']
        if 'current_role' in data: profile.current_role = data['current_role']
        if 'goals' in data: profile.goals = data['goals']
        if 'interests' in data: profile.interests = data['interests']
        if 'daily_available_hours' in data: profile.daily_available_hours = data['daily_available_hours']

        db.session.commit()
        return jsonify({'message': 'Profile updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
