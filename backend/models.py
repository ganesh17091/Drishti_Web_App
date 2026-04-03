from datetime import datetime
from extensions import db
from flask_bcrypt import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    college = db.Column(db.String(150))
    branch = db.Column(db.String(100))
    is_verified = db.Column(db.Boolean, default=False)
    role = db.Column(db.String(20), default='student')
    
    # JWT/Email Validation Tokens
    verification_token = db.Column(db.String(100), nullable=True)
    reset_token = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user_profile = db.relationship('UserProfile', backref='user', uselist=False, lazy=True)
    study_plans = db.relationship('StudyPlan', backref='user', lazy=True)
    skills = db.relationship('Skill', backref='user', lazy=True)
    progress_records = db.relationship('Progress', backref='user', lazy=True)
    notifications = db.relationship('Notification', backref='user', lazy=True)
    activity_logs = db.relationship('UserActivityLog', backref='user', lazy=True)
    ai_recommendations = db.relationship('AIRecommendation', backref='user', lazy=True)
    schedules = db.relationship('UserSchedule', backref='user', lazy=True)
    todos = db.relationship('Todo', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# --- AI Integration Tables ---

class UserProfile(db.Model):
    __tablename__ = 'user_profiles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    age = db.Column(db.Integer)
    current_role = db.Column(db.Text)
    goals = db.Column(db.Text)
    interests = db.Column(db.Text)
    daily_available_hours = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserActivityLog(db.Model):
    __tablename__ = 'user_activity_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    activity_type = db.Column(db.Text)  # e.g. "login", "study", "idle"
    description = db.Column(db.Text)
    duration_minutes = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AIRecommendation(db.Model):
    __tablename__ = 'ai_recommendations'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recommendation_type = db.Column(db.Text) # e.g. "book", "paper", "schedule"
    content = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserSchedule(db.Model):
    __tablename__ = 'user_schedules'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    schedule_date = db.Column(db.Date, nullable=False)
    schedule_data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# --- Original Tables ---

class StudyPlan(db.Model):
    __tablename__ = 'study_plans'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    task = db.Column(db.String(250), nullable=False)
    deadline = db.Column(db.DateTime, nullable=False)
    allocated_hours = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(50), default='pending')

class Skill(db.Model):
    __tablename__ = 'skills'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    skill_name = db.Column(db.String(100), nullable=False)
    skill_level = db.Column(db.String(50))

class Progress(db.Model):
    __tablename__ = 'progress'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    study_hours = db.Column(db.Float, default=0.0)
    tasks_completed = db.Column(db.Integer, default=0)
    productivity_score = db.Column(db.Float, default=0.0)
    date_recorded = db.Column(db.DateTime, default=datetime.utcnow)

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.String(250), nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)

class Todo(db.Model):
    __tablename__ = 'todos'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    is_completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ChatHistory(db.Model):
    __tablename__ = 'chat_history'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False)   # "user" or "assistant"
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ExamGoal(db.Model):
    __tablename__ = 'exam_goals'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    target_date = db.Column(db.Date, nullable=False)
    type = db.Column(db.String(20), default='goal')   # 'exam' or 'goal'
    description = db.Column(db.Text, nullable=True)
    emoji = db.Column(db.String(10), default='📅')
    color = db.Column(db.String(20), default='#8b5cf6')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

