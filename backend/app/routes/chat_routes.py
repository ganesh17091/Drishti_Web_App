from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import (
    ChatHistory, UserProfile, UserActivityLog,
    UserSchedule, StudyPlan, AIRecommendation
)
from app.utils.token_service import token_required
from app.utils import chatbot_engine
from app.services import ai_engine
from datetime import date, datetime

chat_bp = Blueprint('chat', __name__, url_prefix='/chat')


# ─── ACTION EXECUTOR ─────────────────────────────────────────────────────────

def execute_action(current_user, action):
    """Execute a structured action returned by the AI and return a result summary."""
    if not action:
        return None

    action_type = action.get("type")
    data = action.get("data", {})

    try:
        if action_type == "update_schedule":
            profile = UserProfile.query.filter_by(user_id=current_user.id).first()
            if not profile:
                return {"error": "Profile not found — complete onboarding first."}

            logs = UserActivityLog.query.filter_by(user_id=current_user.id) \
                .order_by(UserActivityLog.created_at.desc()).limit(10).all()

            user_request = data.get("request")
            schedule_json = ai_engine.generate_daily_schedule(profile, logs, user_request)

            # Upsert: delete today's existing schedule first
            existing = UserSchedule.query.filter_by(
                user_id=current_user.id, schedule_date=date.today()
            ).first()
            if existing:
                db.session.delete(existing)

            db.session.add(UserSchedule(
                user_id=current_user.id,
                schedule_date=date.today(),
                schedule_data=schedule_json
            ))
            db.session.commit()
            return {"updated": "schedule", "data": schedule_json}

        elif action_type == "add_task":
            task = data.get("task", "New Study Task")
            deadline_str = data.get("deadline", date.today().isoformat())
            hours = float(data.get("allocated_hours", 1.0))

            try:
                deadline = datetime.strptime(deadline_str[:10], "%Y-%m-%d")
            except ValueError:
                deadline = datetime.now()

            plan = StudyPlan(
                user_id=current_user.id,
                task=task,
                deadline=deadline,
                allocated_hours=hours,
                status="pending"
            )
            db.session.add(plan)
            db.session.commit()
            return {"updated": "tasks", "task": task, "deadline": deadline_str}

        elif action_type == "modify_goals":
            profile = UserProfile.query.filter_by(user_id=current_user.id).first()
            if not profile:
                profile = UserProfile(user_id=current_user.id)
                db.session.add(profile)

            if "goals" in data:
                profile.goals = data["goals"]
            if "interests" in data:
                profile.interests = data["interests"]

            db.session.commit()
            return {"updated": "goals", "goals": data.get("goals")}

        elif action_type == "regenerate_recommendations":
            profile = UserProfile.query.filter_by(user_id=current_user.id).first()
            if not profile:
                return {"error": "Profile not found."}

            new_recs = ai_engine.generate_resource_links(profile)
            db.session.add(AIRecommendation(
                user_id=current_user.id,
                recommendation_type="resource_links",
                content=new_recs
            ))
            db.session.commit()
            return {"updated": "recommendations"}

    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}

    return None


# ─── ROUTES ──────────────────────────────────────────────────────────────────

@chat_bp.route('/message', methods=['POST'])
@token_required
def send_message(current_user):
    """Send a message and get an AI response with optional action execution."""
    try:
        data = request.get_json()
        user_message = (data.get("message") or "").strip()

        if not user_message:
            return jsonify({"error": "Message cannot be empty."}), 400

        # Persist user message first
        user_chat = ChatHistory(
            user_id=current_user.id,
            role="user",
            message=user_message
        )
        db.session.add(user_chat)
        db.session.flush()  # Assign ID without committing

        # Load all context needed for Gemini
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        logs = UserActivityLog.query.filter_by(user_id=current_user.id) \
            .order_by(UserActivityLog.created_at.desc()).limit(20).all()
        schedule = UserSchedule.query.filter_by(
            user_id=current_user.id, schedule_date=date.today()
        ).first()

        # Load recent history (excluding the message we just added via flush)
        history_raw = ChatHistory.query.filter_by(user_id=current_user.id) \
            .order_by(ChatHistory.created_at.desc()).limit(22).all()
        history = list(reversed(history_raw[1:]))  # Exclude the flushed user msg

        # Generate AI response
        result = chatbot_engine.generate_chat_response(
            current_user, user_message, profile, logs, schedule, history
        )

        ai_reply = result.get("reply", "I'm here to help!")
        action = result.get("action")

        # Persist assistant message
        db.session.add(ChatHistory(
            user_id=current_user.id,
            role="assistant",
            message=ai_reply
        ))
        db.session.commit()

        # Execute any structured action
        action_result = execute_action(current_user, action) if action else None

        return jsonify({
            "reply": ai_reply,
            "action": action,
            "action_result": action_result
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@chat_bp.route('/history', methods=['GET'])
@token_required
def get_history(current_user):
    """Return the last N chat messages for this user."""
    try:
        n = request.args.get("n", 60, type=int)
        messages = ChatHistory.query.filter_by(user_id=current_user.id) \
            .order_by(ChatHistory.created_at.asc()).limit(n).all()

        return jsonify([{
            "id": m.id,
            "role": m.role,
            "message": m.message,
            "created_at": m.created_at.isoformat()
        } for m in messages]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@chat_bp.route('/clear', methods=['DELETE'])
@token_required
def clear_history(current_user):
    """Clear all chat history for this user."""
    try:
        ChatHistory.query.filter_by(user_id=current_user.id).delete()
        db.session.commit()
        return jsonify({"message": "Chat history cleared."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
