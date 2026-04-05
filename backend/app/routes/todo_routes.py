from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Todo
from app.utils.token_service import token_required

todo_bp = Blueprint('todo', __name__)

@todo_bp.route('/todos', methods=['GET'])
@token_required
def get_todos(current_user):
    try:
        todos = Todo.query.filter_by(user_id=current_user.id).order_by(Todo.created_at.desc()).all()
        return jsonify([{
            'id': t.id,
            'name': t.name,
            'is_completed': t.is_completed,
            'created_at': t.created_at.isoformat()
        } for t in todos]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@todo_bp.route('/todos', methods=['POST'])
@token_required
def create_todo(current_user):
    try:
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({'error': 'Name is required'}), 400

        new_todo = Todo(user_id=current_user.id, name=data['name'])
        db.session.add(new_todo)
        db.session.commit()
        return jsonify({
            'id': new_todo.id,
            'name': new_todo.name,
            'is_completed': new_todo.is_completed,
            'created_at': new_todo.created_at.isoformat()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@todo_bp.route('/todos/<int:id>', methods=['PUT'])
@token_required
def update_todo(current_user, id):
    try:
        todo = Todo.query.filter_by(id=id, user_id=current_user.id).first()
        if not todo:
            return jsonify({'error': 'Todo not found'}), 404

        data = request.get_json()
        if 'name' in data:
            todo.name = data['name']
        if 'is_completed' in data:
            todo.is_completed = data['is_completed']

        db.session.commit()
        return jsonify({
            'id': todo.id,
            'name': todo.name,
            'is_completed': todo.is_completed,
            'created_at': todo.created_at.isoformat()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@todo_bp.route('/todos/<int:id>', methods=['DELETE'])
@token_required
def delete_todo(current_user, id):
    try:
        todo = Todo.query.filter_by(id=id, user_id=current_user.id).first()
        if not todo:
            return jsonify({'error': 'Todo not found'}), 404

        db.session.delete(todo)
        db.session.commit()
        return jsonify({'message': 'Todo deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
