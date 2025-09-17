from flask import Blueprint, request, jsonify, current_app
from datetime import date, datetime
from app.core.entities.project import ProjectStatus

project_bp = Blueprint('projects', __name__)

@project_bp.route('', methods=['GET'])
def get_projects():
    """Get all projects for a user"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        status = request.args.get('status')
        
        project_service = current_app.project_service
        
        if status:
            try:
                status_enum = ProjectStatus(status)
                projects = project_service._project_repository.get_by_user_and_status(user_id, status_enum)
            except ValueError:
                return jsonify({'error': 'Invalid status value'}), 400
        else:
            projects = project_service.get_user_projects(user_id)
        
        return jsonify({
            'projects': [project.to_dict() for project in projects],
            'count': len(projects)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@project_bp.route('', methods=['POST'])
def create_project():
    """Create a new project"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        user_id = data.get('user_id', 'default_user')
        name = data.get('name')
        description = data.get('description')
        color_code = data.get('color_code')
        deadline_str = data.get('deadline')
        
        if not name:
            return jsonify({'error': 'Project name is required'}), 400
        
        deadline = None
        if deadline_str:
            try:
                deadline = date.fromisoformat(deadline_str)
            except ValueError:
                return jsonify({'error': 'Invalid deadline format. Use YYYY-MM-DD'}), 400
        
        project_service = current_app.project_service
        project = project_service.create_project(
            user_id=user_id,
            name=name,
            description=description,
            color_code=color_code,
            deadline=deadline
        )
        
        return jsonify(project.to_dict()), 201
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@project_bp.route('/<project_id>', methods=['GET'])
def get_project(project_id):
    """Get a specific project"""
    try:
        project_service = current_app.project_service
        project = project_service.get_project_by_id(project_id)
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        return jsonify(project.to_dict())
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@project_bp.route('/<project_id>', methods=['PUT'])
def update_project(project_id):
    """Update a project"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Convert deadline if provided
        if 'deadline' in data and data['deadline']:
            try:
                data['deadline'] = date.fromisoformat(data['deadline'])
            except ValueError:
                return jsonify({'error': 'Invalid deadline format. Use YYYY-MM-DD'}), 400
        
        project_service = current_app.project_service
        project = project_service.update_project(project_id, **data)
        
        return jsonify(project.to_dict())
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@project_bp.route('/<project_id>/archive', methods=['POST'])
def archive_project(project_id):
    """Archive a project"""
    try:
        project_service = current_app.project_service
        project = project_service.archive_project(project_id)
        
        return jsonify(project.to_dict())
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@project_bp.route('/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Delete a project"""
    try:
        project_service = current_app.project_service
        success = project_service.delete_project(project_id)
        
        if success:
            return jsonify({'message': 'Project deleted successfully'})
        else:
            return jsonify({'error': 'Project not found'}), 404
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@project_bp.route('/<project_id>/time-summary', methods=['GET'])
def get_project_time_summary(project_id):
    """Get time summary for a project"""
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        start_date = None
        end_date = None
        
        if start_date_str:
            try:
                start_date = date.fromisoformat(start_date_str)
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
        
        if end_date_str:
            try:
                end_date = date.fromisoformat(end_date_str)
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
        
        project_service = current_app.project_service
        summary = project_service.get_project_time_summary(project_id, start_date, end_date)
        
        return jsonify(summary)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500