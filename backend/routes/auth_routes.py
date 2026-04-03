from flask import Blueprint, request, jsonify
from extensions import db
from models import User
from utils.token_service import generate_random_token, generate_jwt, token_required
from utils.email_service import send_verification_email, send_reset_email

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        name = data.get('name', 'User')
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required.'}), 400
            
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'Email already registered.'}), 409
            
        new_user = User(email=email, name=name)
        new_user.set_password(password)
        new_user.verification_token = generate_random_token()
        new_user.is_verified = False
        
        db.session.add(new_user)
        db.session.commit()
        
        # Send verification email (uses Gmail if EMAIL_USER/EMAIL_PASS set in .env)
        send_verification_email(new_user.email, new_user.verification_token)
        
        return jsonify({
            'message': 'Account created! Check your email to verify your account before logging in.',
            'verify_hint': f'Dev mode: visit http://localhost:5000/auth/verify/{new_user.verification_token}'
        }), 201
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/verify/<token>', methods=['GET'])
def verify_email(token):
    try:
        user = User.query.filter_by(verification_token=token).first()
        if not user:
            return jsonify({'error': 'Invalid or expired verification token.'}), 400
            
        if user.is_verified:
            return jsonify({'message': 'Account already verified. You can log in.'}), 200
            
        user.is_verified = True
        user.verification_token = None
        db.session.commit()
        
        return jsonify({'message': 'Account successfully verified. You can now log in.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required.'}), 400
            
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials.'}), 401
            
        if not user.is_verified:
            return jsonify({'error': 'Please verify your email address before logging in.'}), 403
            
        # Success grants a stateless JWT Token
        token = generate_jwt(user.id)
        
        return jsonify({
            'message': 'Login successful.',
            'token': token,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required.'}), 400
            
        user = User.query.filter_by(email=email).first()
        if user:
            user.reset_token = generate_random_token()
            db.session.commit()
            send_reset_email(user.email, user.reset_token)
            
        # Standard OWASP guideline to return successes on null accounts
        return jsonify({'message': 'If an account exists, a reset link will be sent.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    try:
        data = request.get_json()
        password = data.get('password')
        
        if not password:
            return jsonify({'error': 'New password is required.'}), 400
            
        user = User.query.filter_by(reset_token=token).first()
        
        if not user:
            return jsonify({'error': 'Invalid or expired reset token.'}), 400
            
        user.set_password(password)
        user.reset_token = None
        db.session.commit()
        
        return jsonify({'message': 'Password has been successfully updated.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
