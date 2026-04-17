import os
import logging
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, redirect
from app.extensions import db, limiter
from app.models import User
from app.utils.token_service import generate_random_token, hash_token, generate_jwt, token_required
from app.utils.email_service import send_verification_email, send_reset_email

logger = logging.getLogger(__name__)

_IS_DEV = os.environ.get("FLASK_ENV", "").lower() == "development"

def _debug_error(msg: str, e: Exception) -> dict:
    """Returns a response dict that includes the error detail only in dev mode."""
    body = {"error": msg}
    if _IS_DEV:
        body["debug"] = f"{type(e).__name__}: {str(e)}"
    return body

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/test-email', methods=['POST'])
def test_email():
    """Diagnostic endpoint to test email delivery config directly."""
    try:
        from app.utils.email_service import _dispatch_brevo_email
        from flask import current_app
        import os
        from threading import Thread
        
        test_email = os.environ.get('DEBUG_TEST_EMAIL', 'your_real_email@gmail.com')
        logger.info(f"[/test-email] Attempting test email to {test_email}")
        
        sender = current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@focuspath.com')
        html = "<h3>FocusPath Backend</h3><p>This is an HTTP diagnostic email to verify Brevo configuration is active.</p>"
        
        app = current_app._get_current_object()
        Thread(target=_dispatch_brevo_email, args=(app, "FocusPath Diagnostic Test", sender, test_email, html)).start()
        
        return jsonify({"message": f"Test email successfully dispatched to {test_email}"}), 200
    except Exception as e:
        logger.error(f"[/test-email] Failed to send email: {str(e)}", exc_info=True)
        return jsonify(_debug_error('Email diagnostic failed.', e)), 500

@auth_bp.route('/signup', methods=['POST'])
@limiter.limit("5 per minute")
def signup():
    logger.info("STEP 1 reached - [SIGNUP] Request received")
    try:
        data = request.get_json(silent=True)
        logger.info(f"STEP 2 data received - received payload: {bool(data)}")
        if not data or not isinstance(data, dict):
            logger.warning("[SIGNUP] Missing or malformed JSON body")
            return jsonify({'error': 'Request body must be a valid JSON object.'}), 400

        name = data.get('name', 'User')
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        logger.info(f"[SIGNUP] Attempting signup for email={email}")

        if not email or not password:
            logger.warning("[SIGNUP] Missing email or password in request")
            return jsonify({'error': 'Email and password are required.'}), 400

        # ── Step 1: Check for duplicate ───────────────────────────────────────
        logger.info(f"[SIGNUP] Checking for existing user: {email}")
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            logger.info(f"[SIGNUP] Email already registered: {email}")
            return jsonify({'error': 'Email already registered.'}), 409

        # ── Step 2: Build user object in memory (no DB write yet) ─────────────
        logger.info(f"[SIGNUP] Creating user object for: {email}")
        new_user = User(email=email, name=name)
        try:
            new_user.set_password(password)
            logger.info("[SIGNUP] Password hashed successfully")
        except Exception as hash_err:
            logger.error(f"[SIGNUP] Password hashing failed: {str(hash_err)}", exc_info=True)
            return jsonify(_debug_error('Password processing failed.', hash_err)), 500

        # ── Step 3: Generate verification token ───────────────────────────────
        raw_token = generate_random_token()
        new_user.verification_token = hash_token(raw_token)
        new_user.verification_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
        new_user.is_verified = False
        logger.info("[SIGNUP] Verification token generated")

        # ── Step 4: Stage user (do NOT commit yet) ───────────────────────────
        logger.info("STEP 3 before DB - Staging user in session")
        db.session.add(new_user)

        logger.info("STEP 4 after DB - User staged")

        # ── Step 5: Commit user to DB first ──────────────────────────────────
        # Email is sent AFTER commit so that if the DB write fails the user
        # is never persisted (no orphan token). If email fails after commit,
        # the user can request a new link via /auth/resend-verification.
        logger.info("[SIGNUP] Committing new user to database")
        try:
            db.session.commit()
            logger.info(f"[SIGNUP] SUCCESS — user persisted for {email}")
        except Exception as db_err:
            db.session.rollback()
            logger.error(
                f"[SIGNUP] Database commit failed for {email}: {str(db_err)}",
                exc_info=True
            )
            return jsonify(_debug_error('Database error. Please try again.', db_err)), 500

        # ── Step 6: Send verification email AFTER committing ──────────────────
        # If email fails the user is already in DB; they can use resend-verification.
        logger.info(f"STEP 5 before email - Attempting to queue async verification email to: {email}")
        try:
            send_verification_email(email, raw_token, name)
            logger.info(f"[SIGNUP] Verification email sent successfully to: {email}")
        except EnvironmentError as env_err:
            logger.error(
                f"[SIGNUP] Email config missing — cannot send verification to {email}: {str(env_err)}",
                exc_info=True
            )
            # User is saved; advise them to use resend-verification
            return jsonify({
                'message': 'Account created but email could not be sent. Use resend-verification to get your link.'
            }), 201
        except Exception as smtp_err:
            logger.error(
                f"[SIGNUP] Email delivery failed for {email}: {str(smtp_err)}",
                exc_info=True
            )
            return jsonify({
                'message': 'Account created but email could not be sent. Use resend-verification to get your link.'
            }), 201

        return jsonify({
            'message': 'Verification email sent. Please check your inbox.'
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"[SIGNUP] Unexpected top-level error: {str(e)}", exc_info=True)
        return jsonify(_debug_error('Signup failed due to server error.', e)), 500


@auth_bp.route('/resend-verification', methods=['POST'])
@limiter.limit("3 per minute")
def resend_verification():
    try:
        data = request.get_json(silent=True)
        if not data or not isinstance(data, dict):
            return jsonify({'error': 'Request body must be a valid JSON object.'}), 400
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
    frontend_url = os.environ.get("FRONTEND_URL", "").strip().rstrip('/')
    if frontend_url and not frontend_url.startswith('http'):
        frontend_url = 'https://' + frontend_url
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
    logger.info("[LOGIN] Request received")
    try:
        data = request.get_json(silent=True)
        if not data or not isinstance(data, dict):
            return jsonify({'error': 'Request body must be a valid JSON object.'}), 400

        email = (data.get('email') or '').strip().lower()
        password = data.get('password')

        if not email or not password:
            return jsonify({'error': 'Email and password are required.'}), 400

        logger.info(f"[LOGIN] Attempt for email={email}")
        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(password):
            logger.warning(f"[LOGIN] Failed credential check for email={email}")
            return jsonify({'error': 'Invalid credentials.'}), 401

        if not user.is_verified:
            logger.warning(f"[LOGIN] Unverified account login attempt: {email}")
            return jsonify({'error': 'Please verify your email address before logging in.'}), 403

        token = generate_jwt(user.id)
        logger.info(f"[LOGIN] SUCCESS for user_id={user.id} email={email}")

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
        logger.error(f"[LOGIN] Unexpected error: {str(e)}", exc_info=True)
        return jsonify(_debug_error('Internal server error.', e)), 500

@auth_bp.route('/forgot-password', methods=['POST'])
@limiter.limit("5 per minute")
def forgot_password():
    logger.info("[FORGOT PASSWORD] Called")

    try:
        data = request.get_json(silent=True)

        if not data or not isinstance(data, dict):
            return jsonify({"error": "Invalid request body"}), 400

        email = data.get("email", "").strip().lower()
        
        if not email:
            return jsonify({"error": "Email is required"}), 400

        user = User.query.filter_by(email=email).first()

        if not user:
            # We return 200 silently to prevent email enumeration attacks
            return jsonify({"message": "If an account exists, a reset email will be dispatched."}), 200

        from app.utils.token_service import generate_random_token, hash_token
        from app.utils.email_service import send_reset_email
        from datetime import datetime, timedelta, timezone
        from app.extensions import db
        
        raw_token = generate_random_token()
        user.reset_token = hash_token(raw_token)
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(days=1)
        db.session.commit()
        
        # This function is now fully asynchronous in the background thread.
        send_reset_email(user.email, raw_token, user.name)

        return jsonify({"message": "If an account exists, a reset email will be dispatched."}), 200

    except Exception as e:
        logger.error(f"[FORGOT PASSWORD] Internal Error: {str(e)}")
        return jsonify({"error": "Internal processor error"}), 500

@auth_bp.route('/reset-password/<token>', methods=['POST'])
@limiter.limit("5 per minute")
def reset_password(token):
    logger.info("[RESET-PASSWORD] Request received")
    try:
        data = request.get_json(silent=True)
        if not data or not isinstance(data, dict):
            return jsonify({'error': 'Request body must be a valid JSON object.'}), 400

        password = data.get('password')

        if not password:
            return jsonify({'error': 'New password is required.'}), 400

        hashed_token = hash_token(token)
        user = User.query.filter_by(reset_token=hashed_token).first()

        if not user:
            logger.warning("[RESET-PASSWORD] Invalid or unknown token provided")
            return jsonify({'error': 'Invalid or expired reset token.'}), 400

        now = datetime.now(timezone.utc)
        if user.reset_token_expires:
            expires = user.reset_token_expires
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires < now:
                logger.warning(f"[RESET-PASSWORD] Expired token for user_id={user.id}")
                return jsonify({'error': 'Reset token has expired.'}), 400

        user.set_password(password)
        user.reset_token = None
        user.reset_token_expires = None

        logger.info(f"[RESET-PASSWORD] Committing password update for user_id={user.id}")
        db.session.commit()
        logger.info(f"[RESET-PASSWORD] SUCCESS for user_id={user.id}")

        return jsonify({'message': 'Password has been successfully updated.'}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"[RESET-PASSWORD] Unexpected error: {str(e)}", exc_info=True)
        return jsonify(_debug_error('Internal server error.', e)), 500
