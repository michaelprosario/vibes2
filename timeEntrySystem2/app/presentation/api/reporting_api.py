from flask import Blueprint, request, jsonify, current_app
from datetime import date, datetime, timedelta

reporting_bp = Blueprint('reports', __name__)

@reporting_bp.route('/time-by-project', methods=['GET'])
def get_time_by_project():
    """Get time distribution by project"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        if not start_date_str or not end_date_str:
            return jsonify({'error': 'start_date and end_date are required'}), 400
        
        try:
            start_date = date.fromisoformat(start_date_str)
            end_date = date.fromisoformat(end_date_str)
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        reporting_service = current_app.reporting_service
        report = reporting_service.get_time_by_project(user_id, start_date, end_date)
        
        return jsonify(report)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reporting_bp.route('/daily-summary', methods=['GET'])
def get_daily_summary():
    """Get daily time tracking summary"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        date_str = request.args.get('date')
        
        if not date_str:
            target_date = date.today()
        else:
            try:
                target_date = date.fromisoformat(date_str)
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        reporting_service = current_app.reporting_service
        summary = reporting_service.get_daily_summary(user_id, target_date)
        
        return jsonify(summary)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reporting_bp.route('/weekly-summary', methods=['GET'])
def get_weekly_summary():
    """Get weekly time tracking summary"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        week_start_str = request.args.get('week_start')
        
        if not week_start_str:
            # Default to start of current week (Monday)
            today = date.today()
            week_start = today - timedelta(days=today.weekday())
        else:
            try:
                week_start = date.fromisoformat(week_start_str)
            except ValueError:
                return jsonify({'error': 'Invalid week_start format. Use YYYY-MM-DD'}), 400
        
        reporting_service = current_app.reporting_service
        summary = reporting_service.get_weekly_summary(user_id, week_start)
        
        return jsonify(summary)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reporting_bp.route('/monthly-summary', methods=['GET'])
def get_monthly_summary():
    """Get monthly time tracking summary"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        year_str = request.args.get('year')
        month_str = request.args.get('month')
        
        if not year_str or not month_str:
            # Default to current month
            today = date.today()
            year = today.year
            month = today.month
        else:
            try:
                year = int(year_str)
                month = int(month_str)
            except ValueError:
                return jsonify({'error': 'Invalid year or month format'}), 400
            
            if month < 1 or month > 12:
                return jsonify({'error': 'Month must be between 1 and 12'}), 400
        
        reporting_service = current_app.reporting_service
        summary = reporting_service.get_monthly_summary(user_id, year, month)
        
        return jsonify(summary)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reporting_bp.route('/productivity-trends', methods=['GET'])
def get_productivity_trends():
    """Get productivity analysis and trends"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        if not start_date_str or not end_date_str:
            return jsonify({'error': 'start_date and end_date are required'}), 400
        
        try:
            start_date = date.fromisoformat(start_date_str)
            end_date = date.fromisoformat(end_date_str)
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        reporting_service = current_app.reporting_service
        trends = reporting_service.get_productivity_trends(user_id, start_date, end_date)
        
        return jsonify(trends)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reporting_bp.route('/time-distribution-chart', methods=['GET'])
def get_time_distribution_chart():
    """Get chart data for time visualization"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        if not start_date_str or not end_date_str:
            return jsonify({'error': 'start_date and end_date are required'}), 400
        
        try:
            start_date = date.fromisoformat(start_date_str)
            end_date = date.fromisoformat(end_date_str)
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        reporting_service = current_app.reporting_service
        chart_data = reporting_service.generate_time_distribution_chart(user_id, start_date, end_date)
        
        return jsonify(chart_data)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reporting_bp.route('/search', methods=['GET'])
def search_entries():
    """Search through time entries"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        query = request.args.get('query', '')
        project_id = request.args.get('project_id')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        # Build filters
        filters = {}
        if project_id:
            filters['project_id'] = project_id
        
        if start_date_str:
            try:
                filters['start_date'] = date.fromisoformat(start_date_str)
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
        
        if end_date_str:
            try:
                filters['end_date'] = date.fromisoformat(end_date_str)
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
        
        reporting_service = current_app.reporting_service
        results = reporting_service.search_entries(user_id, query, filters)
        
        return jsonify({
            'results': results,
            'count': len(results),
            'query': query,
            'filters': {k: v.isoformat() if isinstance(v, date) else v for k, v in filters.items()}
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reporting_bp.route('/export', methods=['GET'])
def export_data():
    """Export time tracking data"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        format_type = request.args.get('format', 'json')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        if format_type not in ['json', 'csv']:
            return jsonify({'error': 'Format must be json or csv'}), 400
        
        # For now, return a placeholder response
        # In a real implementation, you would generate the export file
        return jsonify({
            'message': f'Export in {format_type} format initiated',
            'user_id': user_id,
            'start_date': start_date_str,
            'end_date': end_date_str,
            'download_url': f'/api/reports/download/{format_type}?user_id={user_id}'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500