from flask import Blueprint, jsonify
from models import UserProfile, UserActivityLog, StudyPlan
from utils.token_service import token_required
from datetime import date, datetime, timedelta
from collections import defaultdict

wellbeing_bp = Blueprint('wellbeing', __name__, url_prefix='/wellbeing')

TYPE_COLORS = {
    "study":    "#8b5cf6",
    "reading":  "#ec4899",
    "practice": "#f59e0b",
    "coding":   "#10b981",
    "research": "#6366f1",
    "revision": "#06b6d4",
    "project":  "#f97316",
    "other":    "#64748b",
}

@wellbeing_bp.route('/today', methods=['GET'])
@token_required
def today_stats(current_user):
    try:
        return _compute_today_stats(current_user)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _compute_today_stats(current_user):
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end   = datetime.combine(today, datetime.max.time())

    # ── Today's activity logs ──────────────────────────────────────────────
    logs = UserActivityLog.query.filter_by(user_id=current_user.id).filter(
        UserActivityLog.created_at >= today_start,
        UserActivityLog.created_at <= today_end
    ).order_by(UserActivityLog.created_at.asc()).all()

    total_minutes = sum(l.duration_minutes or 0 for l in logs)
    total_hours   = round(total_minutes / 60, 1)
    session_count = len(logs)

    # ── Daily goal from profile ────────────────────────────────────────────
    profile = UserProfile.query.filter_by(user_id=current_user.id).first()
    daily_goal_hours = (profile.daily_available_hours or 4) if profile else 4
    goal_progress_pct = min(100, round((total_hours / daily_goal_hours) * 100)) if daily_goal_hours else 0

    # ── Activity type breakdown ────────────────────────────────────────────
    type_map = defaultdict(int)
    for l in logs:
        atype = (l.activity_type or "other").lower().strip()
        type_map[atype] += l.duration_minutes or 0

    activity_breakdown = [
        {
            "type":  t,
            "label": t.capitalize(),
            "minutes": m,
            "hours": round(m / 60, 1),
            "pct":   round((m / total_minutes) * 100) if total_minutes else 0,
            "color": TYPE_COLORS.get(t, "#64748b"),
        }
        for t, m in sorted(type_map.items(), key=lambda x: -x[1])
    ]

    # ── Timeline for today ────────────────────────────────────────────────
    timeline = [
        {
            "time":        l.created_at.strftime("%I:%M %p"),
            "type":        (l.activity_type or "other").lower().strip(),
            "label":       (l.activity_type or "Other").capitalize(),
            "description": l.description or "",
            "duration":    l.duration_minutes or 0,
            "color":       TYPE_COLORS.get((l.activity_type or "other").lower().strip(), "#64748b"),
        }
        for l in logs
    ]

    # ── Task stats ────────────────────────────────────────────────────────
    tasks_done    = StudyPlan.query.filter_by(user_id=current_user.id, status='completed').count()
    tasks_pending = StudyPlan.query.filter_by(user_id=current_user.id, status='pending').count()

    # ── Yesterday comparison ──────────────────────────────────────────────
    y_start = today_start - timedelta(days=1)
    y_end   = today_end   - timedelta(days=1)
    y_logs  = UserActivityLog.query.filter_by(user_id=current_user.id).filter(
        UserActivityLog.created_at >= y_start,
        UserActivityLog.created_at <= y_end
    ).all()
    yesterday_minutes = sum(l.duration_minutes or 0 for l in y_logs)
    change_minutes    = total_minutes - yesterday_minutes
    change_pct        = round((change_minutes / yesterday_minutes) * 100) if yesterday_minutes else None

    # ── Focus score (0–100) ───────────────────────────────────────────────
    time_score    = min(total_hours / max(daily_goal_hours, 1), 1) * 60
    session_score = min(session_count / 5, 1) * 20
    task_score    = min(tasks_done / 3, 1) * 20
    focus_score   = min(100, round(time_score + session_score + task_score))

    most_active_type = max(type_map, key=type_map.get) if type_map else None

    # ── Hourly heatmap (0–23) ─────────────────────────────────────────────
    hour_map = defaultdict(int)
    for l in logs:
        hour_map[l.created_at.hour] += l.duration_minutes or 0
    hourly = [{"hour": h, "minutes": hour_map.get(h, 0)} for h in range(24)]

    return jsonify({
        "date":               today.isoformat(),
        "total_minutes":      total_minutes,
        "total_hours":        total_hours,
        "session_count":      session_count,
        "daily_goal_hours":   daily_goal_hours,
        "goal_progress_pct":  goal_progress_pct,
        "activity_breakdown": activity_breakdown,
        "timeline":           timeline,
        "hourly":             hourly,
        "focus_score":        focus_score,
        "most_active_type":   most_active_type,
        "tasks_completed":    tasks_done,
        "tasks_pending":      tasks_pending,
        "yesterday_minutes":  yesterday_minutes,
        "change_pct":         change_pct,
        "change_direction":   "up" if change_minutes >= 0 else "down",
    }), 200
