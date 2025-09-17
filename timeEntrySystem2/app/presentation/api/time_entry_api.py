from flask import Blueprint, request, jsonify, current_app
from datetime import date, datetime

time_entry_bp = Blueprint('time_entries', __name__)

@time_entry_bp.route('', methods=['GET'])
def get_time_entries():
    """Get time entries for a user"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        project_id = request.args.get('project_id')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        time_entry_service = current_app.time_entry_service
        
        # Parse date filters
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
        
        # Get entries based on filters
        if project_id:
            entries = time_entry_service.get_entries_by_project(project_id, start_date, end_date)
        elif start_date and end_date:
            entries = time_entry_service.get_entries_by_date_range(user_id, start_date, end_date)
        else:
            entries = time_entry_service.get_user_entries(user_id)
        
        return jsonify({
            'entries': [entry.to_dict() for entry in entries],
            'count': len(entries)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@time_entry_bp.route('', methods=['POST'])
def create_time_entry():
    """Create a new time entry or start timer"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        user_id = data.get('user_id', 'default_user')
        project_id = data.get('project_id')
        description = data.get('description')
        start_timer = data.get('start_timer', False)
        
        if not project_id:
            return jsonify({'error': 'Project ID is required'}), 400
        
        time_entry_service = current_app.time_entry_service
        
        if start_timer:
            # Start a new timer
            entry = time_entry_service.start_timer(user_id, project_id, description)
        else:
            # Create manual entry
            start_time_str = data.get('start_time')
            end_time_str = data.get('end_time')
            
            if not start_time_str or not end_time_str:
                return jsonify({'error': 'start_time and end_time are required for manual entries'}), 400
            
            try:
                start_time = datetime.fromisoformat(start_time_str)
                end_time = datetime.fromisoformat(end_time_str)
            except ValueError:
                return jsonify({'error': 'Invalid datetime format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'}), 400
            
            entry = time_entry_service.create_manual_entry(
                user_id, project_id, start_time, end_time, description
            )
        
        return jsonify(entry.to_dict()), 201
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@time_entry_bp.route('/<entry_id>', methods=['GET'])
def get_time_entry(entry_id):
    """Get a specific time entry"""
    try:
        time_entry_service = current_app.time_entry_service
        entry = time_entry_service.get_entry_by_id(entry_id)
        
        if not entry:
            return jsonify({'error': 'Time entry not found'}), 404
        
        return jsonify(entry.to_dict())
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@time_entry_bp.route('/<entry_id>', methods=['PUT'])
def update_time_entry(entry_id):
    """Update a time entry"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Convert datetime strings if provided
        if 'start_time' in data:
            try:
                data['start_time'] = datetime.fromisoformat(data['start_time'])
            except ValueError:
                return jsonify({'error': 'Invalid start_time format. Use ISO format'}), 400
        
        if 'end_time' in data:
            try:
                data['end_time'] = datetime.fromisoformat(data['end_time'])
            except ValueError:
                return jsonify({'error': 'Invalid end_time format. Use ISO format'}), 400
        
        time_entry_service = current_app.time_entry_service
        entry = time_entry_service.update_entry(entry_id, **data)
        
        return jsonify(entry.to_dict())
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@time_entry_bp.route('/<entry_id>/stop', methods=['POST'])
def stop_timer(entry_id):
    """Stop a running timer"""
    try:
        time_entry_service = current_app.time_entry_service
        entry = time_entry_service.stop_timer(entry_id)
        
        return jsonify(entry.to_dict())
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@time_entry_bp.route('/<entry_id>', methods=['DELETE'])
def delete_time_entry(entry_id):
    """Delete a time entry"""
    try:
        time_entry_service = current_app.time_entry_service
        success = time_entry_service.delete_entry(entry_id)
        
        if success:
            return jsonify({'message': 'Time entry deleted successfully'})
        else:
            return jsonify({'error': 'Time entry not found'}), 404
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@time_entry_bp.route('/running', methods=['GET'])
def get_running_timer():
    """Get the currently running timer for a user"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        
        time_entry_service = current_app.time_entry_service
        entry = time_entry_service.get_running_timer(user_id)
        
        if entry:
            return jsonify(entry.to_dict())
        else:
            return jsonify({'message': 'No running timer found'}), 404
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@time_entry_bp.route('/<entry_id>/duplicate', methods=['POST'])
def duplicate_time_entry(entry_id):
    """Duplicate a time entry to a new date"""
    try:
        data = request.get_json()
        
        if not data or 'new_date' not in data:
            return jsonify({'error': 'new_date is required'}), 400
        
        try:
            new_date = date.fromisoformat(data['new_date'])
        except ValueError:
            return jsonify({'error': 'Invalid new_date format. Use YYYY-MM-DD'}), 400
        
        time_entry_service = current_app.time_entry_service
        entry = time_entry_service.duplicate_entry(entry_id, new_date)
        
        return jsonify(entry.to_dict()), 201
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500