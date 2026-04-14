import logging
from flask import Blueprint, request, jsonify
from datetime import datetime, date, time, timedelta, timezone
from collections import defaultdict
from sqlalchemy import and_
from app.extensions import db
from app.models import UserProfile, UserActivityLog, AIRecommendation, UserSchedule, StudyPlan
from app.utils.token_service import token_required
from app.services import ai_engine

logger = logging.getLogger(__name__)

ai_bp = Blueprint('ai', __name__, url_prefix='/ai')


@ai_bp.route('/onboarding', methods=['POST'])
@token_required
def onboarding(current_user):
    try:
        data = request.get_json(silent=True)
        if not data or not isinstance(data, dict):
            return jsonify({'error': 'Invalid request body'}), 400
        
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
        profile.college_timing = data.get('college_timing')
        profile.sleep_schedule = data.get('sleep_schedule')
        profile.weak_subjects = data.get('weak_subjects')
        
        db.session.commit()
        return jsonify({"message": "Onboarding profile saved successfully"}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@ai_bp.route('/log-activity', methods=['POST'])
@token_required
def log_activity(current_user):
    try:
        data = request.get_json(silent=True)
        if not data or not isinstance(data, dict):
            return jsonify({'error': 'Invalid request body'}), 400
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
    # Fix #7: removed print() debug statements
    logger.info("[generate-insights] Request started for user_id=%s", current_user.id)
    try:
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            return jsonify({"error": "Profile not found. Please complete onboarding first."}), 404
            
        logs = UserActivityLog.query.filter_by(user_id=current_user.id).order_by(UserActivityLog.created_at.desc()).limit(20).all()

        # Fix #10: check for a cached result for today before calling AI
        today_str = date.today().isoformat()
        cached = AIRecommendation.query.filter_by(
            user_id=current_user.id,
            recommendation_type="insights_daily"
        ).order_by(AIRecommendation.created_at.desc()).first()

        if cached and cached.created_at.date() == date.today():
            logger.info("[generate-insights] Returning cached insights for user_id=%s date=%s", current_user.id, today_str)
            return jsonify(cached.content), 200

        insights = ai_engine.analyze_user(profile, logs)

        if isinstance(insights, dict) and "error" in insights:
            error_type = insights.get("error")
            status = 429 if error_type == "RATE_LIMIT" else 500
            logger.warning("[generate-insights] AI error for user_id=%s: %s", current_user.id, error_type)
            return jsonify(insights), status

        rec = AIRecommendation(
            user_id=current_user.id,
            recommendation_type="insights_daily",
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
    # Fix #7: removed print() debug statements
    logger.info("[generate-schedule] Request started for user_id=%s", current_user.id)
    try:
        data = request.get_json(silent=True)
        # ── 1. VALIDATE: user profile must exist ────────────────────────────────
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            logger.warning(
                "[generate-schedule] No profile found for user_id=%s – returning 400",
                current_user.id
            )
            return jsonify({
                "error": "Profile not found. Please complete onboarding before generating a schedule."
            }), 400

        # Fix #5: activity logs are optional context — no longer blocking
        logs = (
            UserActivityLog.query
            .filter_by(user_id=current_user.id)
            .order_by(UserActivityLog.created_at.desc())
            .limit(10)
            .all()
        )
        logger.info(
            "[generate-schedule] Found profile and %d activity log(s) for user_id=%s",
            len(logs), current_user.id
        )

        # Determine target date
        target_date_str = data.get("date") if data else request.args.get("date")
        if target_date_str:
            try:
                target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
            except ValueError:
                target_date = date.today()
        else:
            target_date = date.today()

        user_request = data.get("request") if data else None

        # Fix #6: If schedule for target_date already exists and user didn't explicitly request an update via chatbot, return existing.
        if not user_request:
            existing = UserSchedule.query.filter_by(
                user_id=current_user.id, schedule_date=target_date
            ).first()
            if existing:
                logger.info("[generate-schedule] Schedule already exists for user_id=%s date=%s. Returning existing.", current_user.id, target_date)
                return jsonify(existing.schedule_data), 200

        # ── 2. CALL AI API (isolated to catch API-specific failures) ─────────────
        try:
            schedule_json = ai_engine.generate_daily_schedule(profile, logs, user_request)
        except Exception as api_err:
            logger.error(
                "[generate-schedule] AI API call failed for user_id=%s: %s",
                current_user.id, api_err, exc_info=True
            )
            return jsonify({"error": "AI service failed. Please try again later."}), 500

        # ── 3. VALIDATE AI RESPONSE FORMAT ──────────────────────────────────────
        if not isinstance(schedule_json, dict):
            logger.error(
                "[generate-schedule] AI returned non-dict response for user_id=%s: %r",
                current_user.id, schedule_json
            )
            return jsonify({"error": "AI returned an invalid response format."}), 500

        if "error" in schedule_json:
            error_type = schedule_json.get("error")
            logger.warning(
                "[generate-schedule] AI engine error key detected for user_id=%s: %s",
                current_user.id, error_type
            )
            status = 429 if error_type == "RATE_LIMIT" else 500
            return jsonify(schedule_json), status

        if "schedule" not in schedule_json:
            logger.error(
                "[generate-schedule] AI response missing 'schedule' key for user_id=%s. Keys: %s",
                current_user.id, list(schedule_json.keys())
            )
            return jsonify({"error": "AI returned an incomplete schedule. Please retry."}), 500

        logger.info(
            "[generate-schedule] Valid schedule received (%d slots) for user_id=%s",
            len(schedule_json.get("schedule", [])), current_user.id
        )

        # ── 4. PERSIST to DB ─────────────────────────────────────────────────────
        sched = UserSchedule.query.filter_by(
            user_id=current_user.id, schedule_date=target_date
        ).first()
        if sched:
            sched.schedule_data = schedule_json
            logger.info("[generate-schedule] Updated existing schedule for user_id=%s date=%s", current_user.id, target_date)
        else:
            sched = UserSchedule(
                user_id=current_user.id,
                schedule_date=target_date,
                schedule_data=schedule_json
            )
            db.session.add(sched)
            logger.info("[generate-schedule] Created new schedule for user_id=%s date=%s", current_user.id, target_date)

        db.session.commit()
        logger.info("[generate-schedule] Schedule saved successfully for user_id=%s", current_user.id)

        return jsonify(schedule_json), 200

    except Exception as e:
        db.session.rollback()
        logger.error(
            "[generate-schedule] Unhandled exception for user_id=%s: %s",
            current_user.id, e, exc_info=True
        )
        return jsonify({"error": "Failed to generate schedule. Please try again."}), 500

# Replace the removed recommendation endpoint with its correct separate function for the career roadmap
@ai_bp.route('/recommendations', methods=['GET'])
@token_required
def get_recommendations(current_user):
    """Returns AI-curated career roadmap, books, and research papers."""
    try:
        cached = AIRecommendation.query.filter_by(
            user_id=current_user.id,
            recommendation_type="career_roadmap"
        ).order_by(AIRecommendation.created_at.desc()).first()

        if cached:
            return jsonify(cached.content), 200

        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            return jsonify({"error": "Profile not found. Complete onboarding first."}), 404

        recs_data = ai_engine.generate_recommendations(profile)
        if "error" in recs_data:
            return jsonify(recs_data), 429 if recs_data.get("error") == "RATE_LIMIT" else 500

        db.session.add(AIRecommendation(
            user_id=current_user.id,
            recommendation_type="career_roadmap",
            content=recs_data
        ))
        db.session.commit()
        return jsonify(recs_data), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@ai_bp.route('/schedule', methods=['GET'])
@token_required
def get_schedule_by_date(current_user):
    try:
        req_date_str = request.args.get('date')
        if req_date_str:
            try:
                target_date = datetime.strptime(req_date_str, "%Y-%m-%d").date()
            except ValueError:
                target_date = date.today()
        else:
            target_date = date.today()
            
        sched = UserSchedule.query.filter_by(user_id=current_user.id, schedule_date=target_date).first()
        if not sched:
            return jsonify({"schedule": []}), 200
        return jsonify(sched.schedule_data), 200
    except Exception as e:
        db.session.rollback()
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
    """Force regenerates resource links (ignores cache). Replaces the old record."""
    try:
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            return jsonify({"error": "Profile not found."}), 404

        resource_data = ai_engine.generate_resource_links(profile)
        if "error" in resource_data:
            return jsonify(resource_data), 429 if resource_data.get("error") == "RATE_LIMIT" else 500

        # Fix #9: delete ALL old resource_link rows so DB doesn't grow unbounded
        AIRecommendation.query.filter_by(
            user_id=current_user.id,
            recommendation_type="resource_links"
        ).delete()

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
    """Computes full performance stats + AI analysis for the insights dashboard.
    Stats (hours, sessions, chart) are always live. AI analysis is cached per day."""
    try:
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            return jsonify({"error": "Profile not found. Complete onboarding first."}), 404

        req_date_str = request.args.get('date')
        if req_date_str:
            try:
                target_date = datetime.strptime(req_date_str, "%Y-%m-%d").date()
            except ValueError:
                target_date = date.today()
        else:
            target_date = date.today()

        # All logs up to the end of target_date, plus one day to include that day's events fully (since created_at is datetime)
        end_of_target = datetime.combine(target_date, time.max)
        all_logs = UserActivityLog.query.filter(
            and_(
                UserActivityLog.user_id == current_user.id,
                UserActivityLog.created_at <= end_of_target
            )
        ).all()

        # Segregate logs specifically for target_date vs all logs
        daily_logs = [l for l in all_logs if l.created_at.date() == target_date]

        total_minutes = sum(l.duration_minutes or 0 for l in all_logs)
        total_hours = round(total_minutes / 60, 1)
        total_sessions = len(all_logs)

        # Daily stats specifically for target_date snapshot
        daily_minutes = sum(l.duration_minutes or 0 for l in daily_logs)
        daily_hours = round(daily_minutes / 60, 1)
        daily_sessions = len(daily_logs)

        # Activity type breakdown for pie chart (from all historical logs up to date)
        type_breakdown = defaultdict(int)
        for l in all_logs:
            atype = l.activity_type or "other"
            type_breakdown[atype] += l.duration_minutes or 0
        activity_pie = [
            {"name": t.capitalize(), "value": round(m / 60, 2)}
            for t, m in type_breakdown.items()
        ]

        # Daily activity last 7 days ending at target_date for bar chart
        daily = defaultdict(int)
        for l in all_logs:
            day_key = l.created_at.strftime("%a %d/%m")
            daily[day_key] += l.duration_minutes or 0
        last_7_days = []
        for i in range(6, -1, -1):
            d = target_date - timedelta(days=i)
            key = d.strftime("%a %d/%m")
            last_7_days.append({
                "day": d.strftime("%a"),
                "date": key,
                "minutes": daily.get(key, 0),
                "hours": round(daily.get(key, 0) / 60, 2)
            })

        # Streak calculation up to target_date
        active_dates = set(l.created_at.date() for l in all_logs)
        streak = 0
        check_day = target_date
        while check_day in active_dates:
            streak += 1
            check_day -= timedelta(days=1)

        # Study plan stats up to target_date
        plans_done = StudyPlan.query.filter(
            and_(
                StudyPlan.user_id == current_user.id, 
                StudyPlan.status == 'completed',
                StudyPlan.deadline <= end_of_target
            )
        ).count()
        # Daily tasks done exactly on target_date
        daily_tasks_done = StudyPlan.query.filter(
            and_(
                StudyPlan.user_id == current_user.id,
                StudyPlan.status == 'completed',
                StudyPlan.completed_at >= datetime.combine(target_date, time.min),
                StudyPlan.completed_at <= end_of_target
            )
        ).count() if hasattr(StudyPlan, 'completed_at') else plans_done  # Fallback to total if no completed_at
        
        # For pending, we might just show all currently pending, or pending relative to target_date. Let's just keep 'pending' overall
        plans_pending = StudyPlan.query.filter_by(user_id=current_user.id, status='pending').count()

        # ── AI Analysis: cached per day to avoid hitting rate limits on every page load ──
        target_date_str_iso = target_date.isoformat()
        cached_analysis = AIRecommendation.query.filter(
            and_(
                AIRecommendation.user_id == current_user.id,
                AIRecommendation.recommendation_type == f"insights_{target_date_str_iso}"
            )
        ).first()

        # Also support legacy "insights_daily" if date is today
        if not cached_analysis and target_date == date.today():
             cached_analysis = AIRecommendation.query.filter_by(
                user_id=current_user.id,
                recommendation_type="insights_daily"
             ).order_by(AIRecommendation.created_at.desc()).first()

        ai_analysis = None
        # Use cache if it exists for the target date
        if cached_analysis and (cached_analysis.recommendation_type == f"insights_{target_date_str_iso}" or (cached_analysis.recommendation_type == "insights_daily" and cached_analysis.created_at.date() == date.today())):
            ai_analysis = cached_analysis.content
            logger.info("[insights] Using cached AI analysis for user_id=%s date=%s", current_user.id, target_date_str_iso)
        else:
            # Only call AI if no cache for that date AND there are logs to analyze
            # For historical dates, if they had logs, we generate it. If they had absolutely no logs on that day, no point generating.
            logs_on_target_date = [l for l in all_logs if l.created_at.date() == target_date]
            if logs_on_target_date or target_date == date.today():
                recent_logs = sorted(all_logs, key=lambda l: l.created_at, reverse=True)[:20]
                if recent_logs:
                    ai_analysis = ai_engine.analyze_user(profile, recent_logs)

                    if isinstance(ai_analysis, dict) and "error" not in ai_analysis:
                        # Save to cache with date specific key
                        db.session.add(AIRecommendation(
                            user_id=current_user.id,
                            recommendation_type=f"insights_{target_date_str_iso}",
                            content=ai_analysis
                        ))
                        db.session.commit()
                        logger.info("[insights] Fresh AI analysis cached for user_id=%s for date=%s", current_user.id, target_date_str_iso)
                    elif isinstance(ai_analysis, dict) and ai_analysis.get("error") == "RATE_LIMIT":
                        # If rate limited, still return stats without AI analysis
                        logger.warning("[insights] Rate limit hit for AI analysis, returning stats only for user_id=%s", current_user.id)
                        ai_analysis = None

        return jsonify({
            "stats": {
                "total_hours": total_hours,
                "total_sessions": total_sessions,
                "daily_hours": daily_hours,
                "daily_sessions": daily_sessions,
                "streak_days": streak,
                "tasks_completed": plans_done,
                "daily_tasks": daily_tasks_done,
                "tasks_pending": plans_pending,
            },
            "daily_chart": last_7_days,
            "activity_pie": activity_pie,
            "ai_analysis": ai_analysis,
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
