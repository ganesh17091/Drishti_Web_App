import os
import random
import sys
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models import User, UserProfile, UserActivityLog, StudyPlan

app = create_app()

def seed_data():
    with app.app_context():
        email = "fakeupsc@example.com"
        # Check if exists
        user = User.query.filter_by(email=email).first()
        if user:
            print("User already exists! Deleting old data...")
            UserActivityLog.query.filter_by(user_id=user.id).delete()
            UserProfile.query.filter_by(user_id=user.id).delete()
            StudyPlan.query.filter_by(user_id=user.id).delete()
            db.session.delete(user)
            db.session.commit()
            
        print("Creating User...")
        user = User(
            name="Rahul Kumar",
            email=email,
            college="NIT - B.Tech Electrical Engineering (2nd Year)",
            branch="Electrical Engineering",
            is_verified=True
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        print("Creating Profile...")
        profile = UserProfile(
            user_id=user.id,
            age=20,
            current_role="2nd Year B.Tech EE Student",
            goals="Crack UPSC Civil Services Examination. Maintain good grades in electrical engineering.",
            interests="Indian Polity, Engineering Mathematics, Current Affairs, International Relations",
            daily_available_hours=6
        )
        db.session.add(profile)
        db.session.commit()

        print("Creating Activity Logs for last 10 days...")
        # 10 days ago to today
        today = datetime.now(timezone.utc)
        start_date = today - timedelta(days=10)
        
        for i in range(11):  # 10 days + today
            current_date = start_date + timedelta(days=i)
            is_weekend = current_date.weekday() in [5, 6] # 5 is Sat, 6 is Sun
            
            # He is free for 6 hours after college, and maybe 10 hours on weekends
            target_hours = 10 if is_weekend else 6
            
            # 35% imperfection rate -> 35% chance to underperform or get distracted
            is_imperfect = random.random() < 0.35
            
            if is_imperfect:
                # Underperform: 0 to 40% of target (maybe busy with college event or tired)
                actual_hours = target_hours * random.uniform(0.0, 0.4)
            else:
                # Perform well: 85% to 105% of target
                actual_hours = target_hours * random.uniform(0.85, 1.05)
                
            actual_minutes = int(actual_hours * 60)
            
            if actual_minutes > 0:
                sessions = random.randint(2, 4)
                split_mins = actual_minutes // sessions
                
                for _ in range(sessions):
                    if is_weekend:
                        hour = random.randint(10, 20)
                    else:
                        hour = random.randint(18, 23)
                        
                    log_time = current_date.replace(hour=hour, minute=random.randint(0, 59))
                    
                    activities = [
                        ("study", "Studied Indian Polity - Fundamental Rights (Laxmikanth)"),
                        ("study", "Read NCERT History Class 11"),
                        ("study", "Electrical Engineering - Circuit Theory Assignment"),
                        ("practice", "UPSC Previous Year Prelims Questions"),
                        ("study", "The Hindu Newspaper & Editorials Analysis"),
                        ("study", "B.Tech Engineering Mathematics Revision"),
                        ("practice", "Answer Writing Practice - GS Paper 2"),
                    ]
                    
                    # Distractions if imperfect
                    if is_imperfect and random.random() < 0.5:
                        activities.append(("idle", "Got distracted on YouTube looking at UPSC vlogs"))
                        activities.append(("idle", "College fest preparation burnout"))
                        
                    act_type, desc = random.choice(activities)
                    
                    # Make idle duration smaller usually
                    duration = split_mins if act_type != "idle" else min(80, split_mins)
                    
                    log = UserActivityLog(
                        user_id=user.id,
                        activity_type=act_type,
                        description=desc,
                        duration_minutes=duration,
                        created_at=log_time
                    )
                    db.session.add(log)
                    
        # Add some pending tasks
        print("Creating Study Plans...")
        tasks = [
            ("Complete Geography NCERT Class 11", today + timedelta(days=2)),
            ("Electrical Machines Lab Record", today + timedelta(days=1)),
            ("Revise Polity Chapter 4", today - timedelta(days=1)), # overdue
            ("Give Mock Test 1 for UPSC CSAT", today + timedelta(days=4)),
        ]
        for task_name, deadline in tasks:
            plan = StudyPlan(
                user_id=user.id,
                task=task_name,
                deadline=deadline,
                allocated_hours=3.0,
                status="pending"
            )
            db.session.add(plan)
            
        db.session.commit()
        print(f"Done! Login with email: {email} and password: password123")

if __name__ == '__main__':
    seed_data()
