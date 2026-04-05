from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import ExamGoal
from app.utils.token_service import token_required
from datetime import date, datetime

exam_bp = Blueprint('exams', __name__, url_prefix='/exams')


def _serialize(g):
    today = date.today()
    days_left = (g.target_date - today).days
    urgency = (
        "critical" if days_left <= 7
        else "soon" if days_left <= 30
        else "upcoming"
    )
    return {
        "id":          g.id,
        "title":       g.title,
        "target_date": g.target_date.isoformat(),
        "type":        g.type,
        "description": g.description or "",
        "emoji":       g.emoji or "📅",
        "color":       g.color or "#8b5cf6",
        "days_left":   days_left,
        "urgency":     urgency,
        "created_at":  g.created_at.isoformat(),
    }


@exam_bp.route('', methods=['GET'])
@token_required
def list_exams(current_user):
    """Return all upcoming exams/goals sorted by target date."""
    try:
        items = ExamGoal.query.filter_by(user_id=current_user.id) \
            .order_by(ExamGoal.target_date.asc()).all()
        # Include past items too (days_left will be negative)
        return jsonify([_serialize(g) for g in items]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@exam_bp.route('', methods=['POST'])
@token_required
def create_exam(current_user):
    """Create a new exam or goal countdown."""
    try:
        data = request.get_json()
        title       = (data.get("title") or "").strip()
        date_str    = data.get("target_date", "")
        item_type   = data.get("type", "goal")       # 'exam' or 'goal'
        description = data.get("description", "")
        emoji       = data.get("emoji", "📅")
        color       = data.get("color", "#8b5cf6")

        if not title:
            return jsonify({"error": "Title is required."}), 400
        if not date_str:
            return jsonify({"error": "Target date is required."}), 400

        try:
            target_date = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

        item = ExamGoal(
            user_id=current_user.id,
            title=title,
            target_date=target_date,
            type=item_type,
            description=description,
            emoji=emoji,
            color=color,
        )
        db.session.add(item)
        db.session.commit()
        return jsonify(_serialize(item)), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@exam_bp.route('/<int:item_id>', methods=['PUT'])
@token_required
def update_exam(current_user, item_id):
    """Update an existing exam/goal."""
    try:
        item = ExamGoal.query.filter_by(id=item_id, user_id=current_user.id).first()
        if not item:
            return jsonify({"error": "Item not found."}), 404

        data = request.get_json()
        if "title" in data:       item.title = data["title"].strip()
        if "type" in data:        item.type = data["type"]
        if "description" in data: item.description = data["description"]
        if "emoji" in data:       item.emoji = data["emoji"]
        if "color" in data:       item.color = data["color"]
        if "target_date" in data:
            try:
                item.target_date = datetime.strptime(data["target_date"][:10], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"error": "Invalid date format."}), 400

        db.session.commit()
        return jsonify(_serialize(item)), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@exam_bp.route('/<int:item_id>', methods=['DELETE'])
@token_required
def delete_exam(current_user, item_id):
    """Delete an exam/goal countdown."""
    try:
        item = ExamGoal.query.filter_by(id=item_id, user_id=current_user.id).first()
        if not item:
            return jsonify({"error": "Item not found."}), 404
        db.session.delete(item)
        db.session.commit()
        return jsonify({"message": "Deleted successfully."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
