from flask import Blueprint, request, jsonify, current_app
from datetime import date
from app.core.entities.timesheet import PeriodType, TimesheetStatus

timesheet_bp = Blueprint('timesheets', __name__)

@timesheet_bp.route('', methods=['GET'])
def get_timesheets():
    """Get timesheets for a user"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        status = request.args.get('status')
        
        timesheet_service = current_app.timesheet_service
        
        if status:
            try:
                status_enum = TimesheetStatus(status)
                timesheets = timesheet_service._timesheet_repository.get_by_user_and_status(user_id, status_enum)
            except ValueError:
                return jsonify({'error': 'Invalid status value'}), 400
        else:
            timesheets = timesheet_service.get_user_timesheets(user_id)
        
        return jsonify({
            'timesheets': [timesheet.to_dict() for timesheet in timesheets],
            'count': len(timesheets)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@timesheet_bp.route('', methods=['POST'])
def create_timesheet():
    """Create a new timesheet"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        user_id = data.get('user_id', 'default_user')
        name = data.get('name')
        period_type_str = data.get('period_type', 'weekly')
        start_date_str = data.get('start_date')
        end_date_str = data.get('end_date')
        
        if not name:
            return jsonify({'error': 'Timesheet name is required'}), 400
        
        if not start_date_str or not end_date_str:
            return jsonify({'error': 'start_date and end_date are required'}), 400
        
        try:
            period_type = PeriodType(period_type_str)
            start_date = date.fromisoformat(start_date_str)
            end_date = date.fromisoformat(end_date_str)
        except ValueError as e:
            return jsonify({'error': f'Invalid data format: {str(e)}'}), 400
        
        timesheet_service = current_app.timesheet_service
        timesheet = timesheet_service.create_timesheet(
            user_id=user_id,
            name=name,
            period_type=period_type,
            start_date=start_date,
            end_date=end_date
        )
        
        return jsonify(timesheet.to_dict()), 201
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@timesheet_bp.route('/<timesheet_id>', methods=['GET'])
def get_timesheet(timesheet_id):
    """Get a specific timesheet with its time entries"""
    try:
        timesheet_service = current_app.timesheet_service
        timesheet = timesheet_service.get_timesheet_by_id(timesheet_id)
        
        if not timesheet:
            return jsonify({'error': 'Timesheet not found'}), 404
        
        # Get associated time entries
        time_entry_service = current_app.time_entry_service
        time_entries = []
        for entry_id in timesheet.entry_ids:
            entry = time_entry_service.get_entry_by_id(entry_id)
            if entry:
                time_entries.append(entry.to_dict())
        
        result = timesheet.to_dict()
        result['time_entries'] = time_entries
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@timesheet_bp.route('/<timesheet_id>', methods=['PUT'])
def update_timesheet(timesheet_id):
    """Update a timesheet"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Convert dates if provided
        if 'start_date' in data:
            try:
                data['start_date'] = date.fromisoformat(data['start_date'])
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
        
        if 'end_date' in data:
            try:
                data['end_date'] = date.fromisoformat(data['end_date'])
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
        
        timesheet_service = current_app.timesheet_service
        timesheet = timesheet_service.update_timesheet(timesheet_id, **data)
        
        return jsonify(timesheet.to_dict())
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@timesheet_bp.route('/<timesheet_id>/submit', methods=['POST'])
def submit_timesheet(timesheet_id):
    """Submit a timesheet for approval"""
    try:
        timesheet_service = current_app.timesheet_service
        timesheet = timesheet_service.submit_timesheet(timesheet_id)
        
        return jsonify(timesheet.to_dict())
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@timesheet_bp.route('/<timesheet_id>/approve', methods=['POST'])
def approve_timesheet(timesheet_id):
    """Approve a timesheet"""
    try:
        timesheet_service = current_app.timesheet_service
        timesheet = timesheet_service.approve_timesheet(timesheet_id)
        
        return jsonify(timesheet.to_dict())
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@timesheet_bp.route('/<timesheet_id>/revert', methods=['POST'])
def revert_timesheet(timesheet_id):
    """Revert a timesheet to draft status"""
    try:
        timesheet_service = current_app.timesheet_service
        timesheet = timesheet_service.revert_timesheet(timesheet_id)
        
        return jsonify(timesheet.to_dict())
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@timesheet_bp.route('/<timesheet_id>/entries', methods=['POST'])
def add_entries_to_timesheet(timesheet_id):
    """Add time entries to a timesheet"""
    try:
        data = request.get_json()
        
        if not data or 'entry_ids' not in data:
            return jsonify({'error': 'entry_ids array is required'}), 400
        
        entry_ids = data['entry_ids']
        if not isinstance(entry_ids, list):
            return jsonify({'error': 'entry_ids must be an array'}), 400
        
        timesheet_service = current_app.timesheet_service
        timesheet = timesheet_service.add_entries_to_timesheet(timesheet_id, entry_ids)
        
        return jsonify(timesheet.to_dict())
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@timesheet_bp.route('/<timesheet_id>/entries', methods=['DELETE'])
def remove_entries_from_timesheet(timesheet_id):
    """Remove time entries from a timesheet"""
    try:
        data = request.get_json()
        
        if not data or 'entry_ids' not in data:
            return jsonify({'error': 'entry_ids array is required'}), 400
        
        entry_ids = data['entry_ids']
        if not isinstance(entry_ids, list):
            return jsonify({'error': 'entry_ids must be an array'}), 400
        
        timesheet_service = current_app.timesheet_service
        timesheet = timesheet_service.remove_entries_from_timesheet(timesheet_id, entry_ids)
        
        return jsonify(timesheet.to_dict())
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@timesheet_bp.route('/<timesheet_id>/recalculate', methods=['POST'])
def recalculate_timesheet_totals(timesheet_id):
    """Recalculate timesheet totals"""
    try:
        timesheet_service = current_app.timesheet_service
        timesheet = timesheet_service.calculate_timesheet_totals(timesheet_id)
        
        return jsonify(timesheet.to_dict())
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@timesheet_bp.route('/<timesheet_id>', methods=['DELETE'])
def delete_timesheet(timesheet_id):
    """Delete a timesheet"""
    try:
        timesheet_service = current_app.timesheet_service
        success = timesheet_service.delete_timesheet(timesheet_id)
        
        if success:
            return jsonify({'message': 'Timesheet deleted successfully'})
        else:
            return jsonify({'error': 'Timesheet not found'}), 404
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500