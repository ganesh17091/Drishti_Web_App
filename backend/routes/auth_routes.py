import os
import logging
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, redirect
from extensions import db, limiter
from models import User
from utils.token_service import generate_random_token, hash_token, generate_jwt, token_required
from utils.email_service import send_verification_email, send_reset_email

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/signup', methods=['POST'])
@limiter.limit("5 per minute")
def signup():
    try:
        data = request.get_json()
        name = data.get('name', 'User')
        email = data.get('email', '').strip()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required.'}), 400

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'Email already registered.'}), 409

        # Build the user in memory — do NOT commit yet
        new_user = User(email=email, name=name)
        new_user.set_password(password)

        raw_token = generate_random_token()
        new_user.verification_token = hash_token(raw_token)
        new_user.verification_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
        new_user.is_verified = False

        db.session.add(new_user)

        # Attempt email delivery BEFORE committing to DB.
        # If this raises, the session is rolled back and the user is never persisted.
        try:
            send_verification_email(email, raw_token, name)
        except EnvironmentError as env_err:
            db.session.rollback()
            logger.error(f"Email config error during signup: {str(env_err)}")
            return jsonify({'error': 'Email service is not configured. Please contact support.'}), 500
        except Exception as smtp_err:
            db.session.rollback()
            logger.error(f"SMTP delivery failure during signup for {email}: {str(smtp_err)}")
            return jsonify({'error': 'Failed to send verification email. Please try again.'}), 500

        # Email confirmed sent — now persist the user
        db.session.commit()
        logger.info(f"New user registered and verification email sent to {email}")

        return jsonify({
            'message': 'Verification email sent. Please check your inbox.'
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected signup error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/resend-verification', methods=['POST'])
@limiter.limit("3 per minute")
def resend_verification():
    try:
        data = request.get_json()
        email = data.get('email', '').strip()

        if not email:
            return jsonify({'error': 'Email is required.'}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            # OWASP: same response for non-existent accounts
            return jsonify({'message': 'If the account exists and is unverified, an email was sent.'}), 200

        if user.is_verified:
            return jsonify({'message': 'Account already verified. You can log in.'}), 200

        raw_token = generate_random_token()
        user.verification_token = hash_token(raw_token)
        user.verification_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
        db.session.commit()  # Safe to commit token update before email attempt

        try:
            send_verification_email(user.email, raw_token, user.name)
        except Exception as e:
            logger.error(f"Resend verification email failed for {email}: {str(e)}")
            return jsonify({'error': 'Failed to send verification email. Please try again.'}), 500

        return jsonify({'message': 'If the account exists and is unverified, an email was sent.'}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected resend-verification error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/verify/<token>', methods=['GET'])
def verify_email(token):
    frontend_url = os.environ.get("FRONTEND_URL", "").rstrip('/')
    if not frontend_url:
        logger.error("FRONTEND_URL environment variable is not set.")
        return "Server configuration error.", 500
    try:
        hashed_token = hash_token(token)
        user = User.query.filter_by(verification_token=hashed_token).first()
        
        if not user:
            return redirect(f"{frontend_url}/auth?error=invalid_token")
            
        now = datetime.now(timezone.utc)
        if user.verification_token_expires:
            expires = user.verification_token_expires
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires < now:
                return redirect(f"{frontend_url}/auth?error=expired_token")
            
        if user.is_verified:
            return redirect(f"{frontend_url}/auth?verified=true")
            
        user.is_verified = True
        user.verification_token = None
        user.verification_token_expires = None
        db.session.commit()
        
        return redirect(f"{frontend_url}/auth?verified=true")
        
    except Exception as e:
        db.session.rollback()
        logger.error("Verification endpoint error", exc_info=False)
        return redirect(f"{frontend_url}/auth?error=server_error")

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
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
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
@limiter.limit("3 per minute")
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email', '').strip()

        if not email:
            return jsonify({'error': 'Email is required.'}), 400

        user = User.query.filter_by(email=email).first()
        if user:
            raw_token = generate_random_token()
            user.reset_token = hash_token(raw_token)
            user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
            db.session.commit()  # Safe to commit token update before email attempt

            try:
                send_reset_email(user.email, raw_token, user.name)
            except Exception as e:
                logger.error(f"Password reset email failed for {email}: {str(e)}")
                # OWASP: Do not reveal whether account exists — return same message
                # but internally we've logged the failure

        # Same response regardless of outcome — prevents email enumeration
        return jsonify({'message': 'If an account exists, a reset link will be sent.'}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected forgot-password error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/reset-password/<token>', methods=['POST'])
@limiter.limit("5 per minute")
def reset_password(token):
    try:
        data = request.get_json()
        password = data.get('password')
        
        if not password:
            return jsonify({'error': 'New password is required.'}), 400
            
        hashed_token = hash_token(token)
        user = User.query.filter_by(reset_token=hashed_token).first()
        
        if not user:
            return jsonify({'error': 'Invalid or expired reset token.'}), 400
            
        now = datetime.now(timezone.utc)
        if user.reset_token_expires:
            expires = user.reset_token_expires
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires < now:
                return jsonify({'error': 'Reset token has expired.'}), 400
            
        user.set_password(password)
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()
        
        return jsonify({'message': 'Password has been successfully updated.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500
