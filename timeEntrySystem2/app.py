from flask import Flask, render_template, jsonify
from flask_cors import CORS
from app.infrastructure.repositories.json_user_repository import JsonUserRepository
from app.infrastructure.repositories.json_project_repository import JsonProjectRepository
from app.infrastructure.repositories.json_time_entry_repository import JsonTimeEntryRepository
from app.infrastructure.repositories.json_timesheet_repository import JsonTimesheetRepository
from app.core.services.project_service import ProjectService
from app.core.services.time_entry_service import TimeEntryService
from app.core.services.timesheet_service import TimesheetService
from app.core.services.reporting_service import ReportingService
from app.core.services.user_preferences_service import UserPreferencesService
from app.presentation.api.project_api import project_bp
from app.presentation.api.time_entry_api import time_entry_bp
from app.presentation.api.timesheet_api import timesheet_bp
from app.presentation.api.reporting_api import reporting_bp
import os

def create_app():
    app = Flask(__name__, 
                template_folder='app/presentation/templates',
                static_folder='app/presentation/static')
    
    app.config['SECRET_KEY'] = 'your-secret-key-here'
    CORS(app)
    
    # Ensure data directory exists
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    # Initialize repositories
    user_repo = JsonUserRepository(data_dir)
    project_repo = JsonProjectRepository(data_dir)
    time_entry_repo = JsonTimeEntryRepository(data_dir)
    timesheet_repo = JsonTimesheetRepository(data_dir)
    
    # Initialize services
    project_service = ProjectService(project_repo, time_entry_repo)
    time_entry_service = TimeEntryService(time_entry_repo, project_repo)
    timesheet_service = TimesheetService(timesheet_repo, time_entry_repo)
    reporting_service = ReportingService(time_entry_repo, project_repo, timesheet_repo)
    user_preferences_service = UserPreferencesService(user_repo)
    
    # Store services in app context
    app.project_service = project_service
    app.time_entry_service = time_entry_service
    app.timesheet_service = timesheet_service
    app.reporting_service = reporting_service
    app.user_preferences_service = user_preferences_service
    
    # Register blueprints
    app.register_blueprint(project_bp, url_prefix='/api/projects')
    app.register_blueprint(time_entry_bp, url_prefix='/api/time-entries')
    app.register_blueprint(timesheet_bp, url_prefix='/api/timesheets')
    app.register_blueprint(reporting_bp, url_prefix='/api/reports')
    
    @app.route('/')
    def index():
        return render_template('index.html')
    
    @app.route('/projects')
    def projects():
        return render_template('projects.html')
    
    @app.route('/timesheets')
    def timesheets():
        return render_template('timesheets.html')
    
    @app.route('/reports')
    def reports():
        return render_template('reports.html')
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)