import os
import jwt
from datetime import datetime, timedelta, timezone
import secrets
import hashlib
from functools import wraps
from flask import request, jsonify

def generate_random_token():
    """Generates a secure random 32-byte token for verification/resets"""
    return secrets.token_urlsafe(32)

def hash_token(raw_token):
    """Generates a deterministic SHA-256 hash of a raw token for DB storage"""
    return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

def generate_jwt(user_id):
    """Generates a JSON Web Token for stateless authentication"""
    secret = os.getenv('JWT_SECRET')
    if not secret:
        raise EnvironmentError("JWT_SECRET environment variable is not set.")
    now = datetime.now(timezone.utc)
    payload = {
        'user_id': user_id,
        'exp': now + timedelta(days=1),
        'iat': now
    }
    return jwt.encode(payload, secret, algorithm='HS256')

def decode_jwt(token):
    """Decodes string token back to user_id, or returns None if invalid"""
    secret = os.getenv('JWT_SECRET')
    if not secret:
        return None
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Authentication Decorator to secure endpoints"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check HTTP Authorization header
        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split()
            if len(parts) == 2 and parts[0] == 'Bearer':
                token = parts[1]
                
        if not token:
            return jsonify({'error': 'Authentication token is missing!'}), 401
            
        user_id = decode_jwt(token)
        if not user_id:
            return jsonify({'error': 'Authentication token is invalid or expired!'}), 401
            
        from models import User
        from extensions import db
        current_user = db.session.get(User, user_id)
        if not current_user:
            return jsonify({'error': 'User not found!'}), 401
            
        return f(current_user, *args, **kwargs)
        
    return decorated
