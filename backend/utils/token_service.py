import os
import jwt
from datetime import datetime, timedelta
import secrets
from functools import wraps
from flask import request, jsonify

def generate_random_token():
    """Generates a secure random 32-byte token for verification/resets"""
    return secrets.token_urlsafe(32)

def generate_jwt(user_id):
    """Generates a JSON Web Token for stateless authentication"""
    secret = os.getenv('JWT_SECRET', 'fallback-dev-secret')
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=1), # 1 day expiration
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, secret, algorithm='HS256')

def decode_jwt(token):
    """Decodes string token back to user_id, or returns None if invalid"""
    secret = os.getenv('JWT_SECRET', 'fallback-dev-secret')
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
