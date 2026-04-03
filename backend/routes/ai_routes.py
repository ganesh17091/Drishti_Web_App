from flask import Blueprint, request, jsonify
from datetime import date, timedelta
from collections import defaultdict
from extensions import db
from models import UserProfile, UserActivityLog, AIRecommendation, UserSchedule, StudyPlan
from utils.token_service import token_required
from utils import ai_engine

ai_bp = Blueprint('ai', __name__, url_prefix='/ai')


@ai_bp.route('/onboarding', methods=['POST'])
@token_required
def onboarding(current_user):
    try:
        data = request.get_json()
        
        # Check if profile exists already
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            profile = UserProfile(user_id=current_user.id)
            db.session.add(profile)
            
        profile.age = data.get('age')
        profile.current_role = data.get('current_role')
        profile.goals = data.get('goals')
        profile.interests = data.get('interests')
        profile.daily_available_hours = data.get('daily_available_hours')
        
        db.session.commit()
        return jsonify({"message": "Onboarding profile saved successfully"}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@ai_bp.route('/log-activity', methods=['POST'])
@token_required
def log_activity(current_user):
    try:
        data = request.get_json()
        log = UserActivityLog(
            user_id=current_user.id,
            activity_type=data.get('activity_type'),
            description=data.get('description'),
            duration_minutes=data.get('duration_minutes', 0)
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({"message": "Activity tracked"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@ai_bp.route('/generate-insights', methods=['POST'])
@token_required
def generate_insights(current_user):
    try:
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            return jsonify({"error": "Profile not found. Please complete onboarding first."}), 404
            
        logs = UserActivityLog.query.filter_by(user_id=current_user.id).order_by(UserActivityLog.created_at.desc()).limit(20).all()
        
        insights = ai_engine.analyze_user(profile, logs)
        
        rec = AIRecommendation(
            user_id=current_user.id,
            recommendation_type="insights",
            content=insights
        )
        db.session.add(rec)
        db.session.commit()
        
        return jsonify(insights), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@ai_bp.route('/generate-schedule', methods=['POST'])
@token_required
def generate_schedule(current_user):
    try:
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            return jsonify({"error": "Profile not found."}), 404
            
        logs = UserActivityLog.query.filter_by(user_id=current_user.id).order_by(UserActivityLog.created_at.desc()).limit(10).all()
        
        schedule_json = ai_engine.generate_daily_schedule(profile, logs)
        if "error" in schedule_json:
            return jsonify(schedule_json), 429 if schedule_json.get("error") == "RATE_LIMIT" else 500
        
        # Check if schedule exists for today to update it, otherwise create new
        sched = UserSchedule.query.filter_by(user_id=current_user.id, schedule_date=date.today()).first()
        if sched:
            sched.schedule_data = schedule_json
        else:
            sched = UserSchedule(
                user_id=current_user.id,
                schedule_date=date.today(),
                schedule_data=schedule_json
            )
            db.session.add(sched)
            
        db.session.commit()
        
        return jsonify(schedule_json), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@ai_bp.route('/recommendations', methods=['GET'])
@token_required
def get_recommendations(current_user):
    """Can act as both fetch and generate if empty"""
    try:
        recs = AIRecommendation.query.filter_by(user_id=current_user.id, recommendation_type="resources").order_by(AIRecommendation.created_at.desc()).first()
        
        if not recs:
            profile = UserProfile.query.filter_by(user_id=current_user.id).first()
            if not profile:
                return jsonify({"error": "Profile not found"}), 404
                
            new_recs_json = ai_engine.generate_recommendations(profile)
            if "error" in new_recs_json:
                return jsonify(new_recs_json), 429 if new_recs_json.get("error") == "RATE_LIMIT" else 500

            new_rec_db = AIRecommendation(
                user_id=current_user.id,
                recommendation_type="resources",
                content=new_recs_json
            )
            db.session.add(new_rec_db)
            db.session.commit()
            return jsonify(new_recs_json), 200
            
        return jsonify(recs.content), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ai_bp.route('/schedule/today', methods=['GET'])
@token_required
def get_today_schedule(current_user):
    try:
        sched = UserSchedule.query.filter_by(user_id=current_user.id, schedule_date=date.today()).first()
        if not sched:
            return jsonify({"schedule": []}), 200
        return jsonify(sched.schedule_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ai_bp.route('/resources', methods=['GET'])
@token_required
def get_resource_links(current_user):
    """Returns AI-curated book links, YouTube videos, shorts, and courses.
    Fetches cached from DB; generates fresh if none exist."""
    try:
        cached = AIRecommendation.query.filter_by(
            user_id=current_user.id,
            recommendation_type="resource_links"
        ).order_by(AIRecommendation.created_at.desc()).first()

        if cached:
            return jsonify(cached.content), 200

        # Generate fresh
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            return jsonify({"error": "Profile not found. Complete onboarding first."}), 404

        resource_data = ai_engine.generate_resource_links(profile)
        if "error" in resource_data:
            return jsonify(resource_data), 429 if resource_data.get("error") == "RATE_LIMIT" else 500

        db.session.add(AIRecommendation(
            user_id=current_user.id,
            recommendation_type="resource_links",
            content=resource_data
        ))
        db.session.commit()
        return jsonify(resource_data), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@ai_bp.route('/resources/refresh', methods=['POST'])
@token_required
def refresh_resource_links(current_user):
    """Force regenerates resource links from Gemini (ignores cache)."""
    try:
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            return jsonify({"error": "Profile not found."}), 404

        resource_data = ai_engine.generate_resource_links(profile)
        if "error" in resource_data:
            return jsonify(resource_data), 429 if resource_data.get("error") == "RATE_LIMIT" else 500

        db.session.add(AIRecommendation(
            user_id=current_user.id,
            recommendation_type="resource_links",
            content=resource_data
        ))
        db.session.commit()
        return jsonify(resource_data), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500



@ai_bp.route('/insights', methods=['GET'])
@token_required
def get_insights(current_user):
    """Computes full performance stats + AI analysis for the insights dashboard."""
    try:
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            return jsonify({"error": "Profile not found. Complete onboarding first."}), 404

        all_logs = UserActivityLog.query.filter_by(user_id=current_user.id).all()

        total_minutes = sum(l.duration_minutes or 0 for l in all_logs)
        total_hours = round(total_minutes / 60, 1)
        total_sessions = len(all_logs)

        # Activity type breakdown for pie chart
        type_breakdown = defaultdict(int)
        for l in all_logs:
            atype = l.activity_type or "other"
            type_breakdown[atype] += l.duration_minutes or 0
        activity_pie = [
            {"name": t.capitalize(), "value": round(m / 60, 2)}
            for t, m in type_breakdown.items()
        ]

        # Daily activity last 7 days for bar chart
        daily = defaultdict(int)
        for l in all_logs:
            day_key = l.created_at.strftime("%a %d/%m")
            daily[day_key] += l.duration_minutes or 0
        last_7_days = []
        for i in range(6, -1, -1):
            d = date.today() - timedelta(days=i)
            key = d.strftime("%a %d/%m")
            last_7_days.append({
                "day": d.strftime("%a"),
                "date": key,
                "minutes": daily.get(key, 0),
                "hours": round(daily.get(key, 0) / 60, 2)
            })

        # Streak calculation
        active_dates = set(l.created_at.date() for l in all_logs)
        streak = 0
        check_day = date.today()
        while check_day in active_dates:
            streak += 1
            check_day -= timedelta(days=1)

        # Study plan stats
        plans_done = StudyPlan.query.filter_by(user_id=current_user.id, status='completed').count()
        plans_pending = StudyPlan.query.filter_by(user_id=current_user.id, status='pending').count()

        # AI Analysis using Gemini (last 20 logs)
        recent_logs = sorted(all_logs, key=lambda l: l.created_at, reverse=True)[:20]
        ai_analysis = ai_engine.analyze_user(profile, recent_logs)

        return jsonify({
            "stats": {
                "total_hours": total_hours,
                "total_sessions": total_sessions,
                "streak_days": streak,
                "tasks_completed": plans_done,
                "tasks_pending": plans_pending,
            },
            "daily_chart": last_7_days,
            "activity_pie": activity_pie,
            "ai_analysis": ai_analysis,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
