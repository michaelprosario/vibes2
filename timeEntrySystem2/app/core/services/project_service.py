from typing import List, Optional
from datetime import date
from app.core.entities.project import Project, ProjectStatus
from app.core.interfaces.project_repository import IProjectRepository
from app.core.interfaces.time_entry_repository import ITimeEntryRepository

class ProjectService:
    """
    Manages project lifecycle and business logic
    """
    
    def __init__(self, project_repository: IProjectRepository, time_entry_repository: ITimeEntryRepository):
        self._project_repository = project_repository
        self._time_entry_repository = time_entry_repository
    
    def create_project(self, user_id: str, name: str, description: Optional[str] = None, 
                      color_code: Optional[str] = None, deadline: Optional[date] = None) -> Project:
        """Creates new project with validation"""
        # Validate unique project name for user
        if not self.validate_project_name(user_id, name):
            raise ValueError(f"Project name '{name}' already exists for this user")
        
        # Create project
        project = Project(
            user_id=user_id,
            name=name,
            description=description,
            deadline=deadline
        )
        
        # Set color code with validation
        if color_code:
            project.set_color_code(color_code)
        
        return self._project_repository.create(project)
    
    def update_project(self, project_id: str, **kwargs) -> Project:
        """Updates project details with validation"""
        project = self._project_repository.get_by_id(project_id)
        if not project:
            raise ValueError("Project not found")
        
        # Check for name uniqueness if name is being updated
        if 'name' in kwargs and kwargs['name'] != project.name:
            if not self.validate_project_name(project.user_id, kwargs['name']):
                raise ValueError(f"Project name '{kwargs['name']}' already exists for this user")
        
        # Update fields
        for field, value in kwargs.items():
            if field == 'color_code':
                project.set_color_code(value)
            elif field == 'status':
                project.update_status(ProjectStatus(value))
            elif hasattr(project, field):
                setattr(project, field, value)
        
        return self._project_repository.update(project)
    
    def archive_project(self, project_id: str) -> Project:
        """Archives a project after validation"""
        project = self._project_repository.get_by_id(project_id)
        if not project:
            raise ValueError("Project not found")
        
        # Check if there are running timers for this project
        running_timer = self._time_entry_repository.get_running_timer(project.user_id)
        if running_timer and running_timer.project_id == project_id:
            raise ValueError("Cannot archive project with running timer")
        
        project.archive()
        return self._project_repository.update(project)
    
    def get_active_projects(self, user_id: str) -> List[Project]:
        """Retrieves active projects for user"""
        return self._project_repository.get_by_user_and_status(user_id, ProjectStatus.ACTIVE)
    
    def get_project_by_id(self, project_id: str) -> Optional[Project]:
        """Retrieves specific project"""
        return self._project_repository.get_by_id(project_id)
    
    def get_user_projects(self, user_id: str) -> List[Project]:
        """Get all projects for a user"""
        return self._project_repository.get_by_user_id(user_id)
    
    def validate_project_name(self, user_id: str, name: str) -> bool:
        """Ensures unique project names per user"""
        existing_project = self._project_repository.get_by_name(user_id, name)
        return existing_project is None
    
    def get_project_time_summary(self, project_id: str, start_date: Optional[date] = None, 
                                end_date: Optional[date] = None) -> dict:
        """Get time spent summary for a project"""
        if start_date and end_date:
            time_entries = self._time_entry_repository.get_by_project_and_date_range(
                project_id, start_date, end_date)
        else:
            time_entries = self._time_entry_repository.get_by_project_id(project_id)
        
        total_minutes = sum(entry.duration_minutes for entry in time_entries)
        total_hours = round(total_minutes / 60.0, 2)
        
        return {
            'project_id': project_id,
            'total_hours': total_hours,
            'total_minutes': total_minutes,
            'entry_count': len(time_entries),
            'start_date': start_date.isoformat() if start_date else None,
            'end_date': end_date.isoformat() if end_date else None
        }
    
    def delete_project(self, project_id: str) -> bool:
        """Delete project if no associated time entries"""
        # Check if project has time entries
        time_entries = self._time_entry_repository.get_by_project_id(project_id)
        if time_entries:
            raise ValueError("Cannot delete project with existing time entries")
        
        return self._project_repository.delete(project_id)