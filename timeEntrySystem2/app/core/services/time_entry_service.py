from typing import List, Optional
from datetime import datetime, date
from app.core.entities.time_entry import TimeEntry
from app.core.entities.project import ProjectStatus
from app.core.interfaces.time_entry_repository import ITimeEntryRepository
from app.core.interfaces.project_repository import IProjectRepository

class TimeEntryService:
    """
    Manages time tracking operations and business logic
    """
    
    def __init__(self, time_entry_repository: ITimeEntryRepository, project_repository: IProjectRepository):
        self._time_entry_repository = time_entry_repository
        self._project_repository = project_repository
    
    def start_timer(self, user_id: str, project_id: str, description: Optional[str] = None) -> TimeEntry:
        """Starts new time tracking session"""
        # Validate project exists and is not archived
        project = self._project_repository.get_by_id(project_id)
        if not project:
            raise ValueError("Project not found")
        
        if project.is_archived():
            raise ValueError("Cannot start timer for archived project")
        
        if project.user_id != user_id:
            raise ValueError("Project does not belong to user")
        
        # Check if user already has a running timer
        running_timer = self.get_running_timer(user_id)
        if running_timer:
            raise ValueError("User already has a running timer. Stop current timer first.")
        
        # Create new time entry
        time_entry = TimeEntry(
            user_id=user_id,
            project_id=project_id,
            description=description,
            is_running=True
        )
        time_entry.start_timer()
        
        return self._time_entry_repository.create(time_entry)
    
    def stop_timer(self, entry_id: str) -> TimeEntry:
        """Stops running timer"""
        time_entry = self._time_entry_repository.get_by_id(entry_id)
        if not time_entry:
            raise ValueError("Time entry not found")
        
        if not time_entry.is_running:
            raise ValueError("Timer is not running")
        
        time_entry.stop_timer()
        return self._time_entry_repository.update(time_entry)
    
    def create_manual_entry(self, user_id: str, project_id: str, start_time: datetime, 
                           end_time: datetime, description: Optional[str] = None) -> TimeEntry:
        """Creates manual time entry with validation"""
        # Validate project
        project = self._project_repository.get_by_id(project_id)
        if not project:
            raise ValueError("Project not found")
        
        if project.is_archived():
            raise ValueError("Cannot create entries for archived project")
        
        if project.user_id != user_id:
            raise ValueError("Project does not belong to user")
        
        # Validate time overlap
        if self.validate_time_overlap(user_id, start_time, end_time):
            raise ValueError("Time entry overlaps with existing entry")
        
        # Create time entry
        time_entry = TimeEntry(
            user_id=user_id,
            project_id=project_id,
            description=description,
            is_running=False
        )
        
        time_entry.update_times(start_time, end_time)
        
        return self._time_entry_repository.create(time_entry)
    
    def update_entry(self, entry_id: str, **kwargs) -> TimeEntry:
        """Updates existing time entry with validation"""
        time_entry = self._time_entry_repository.get_by_id(entry_id)
        if not time_entry:
            raise ValueError("Time entry not found")
        
        # If updating times, validate overlap
        start_time = kwargs.get('start_time', time_entry.start_time)
        end_time = kwargs.get('end_time', time_entry.end_time)
        
        if 'start_time' in kwargs or 'end_time' in kwargs:
            if end_time and self.validate_time_overlap(time_entry.user_id, start_time, end_time, entry_id):
                raise ValueError("Updated time entry would overlap with existing entry")
            time_entry.update_times(start_time, end_time)
        
        # Update other fields
        for field, value in kwargs.items():
            if field not in ['start_time', 'end_time'] and hasattr(time_entry, field):
                setattr(time_entry, field, value)
        
        return self._time_entry_repository.update(time_entry)
    
    def delete_entry(self, entry_id: str) -> bool:
        """Removes time entry"""
        time_entry = self._time_entry_repository.get_by_id(entry_id)
        if not time_entry:
            raise ValueError("Time entry not found")
        
        return self._time_entry_repository.delete(entry_id)
    
    def get_running_timer(self, user_id: str) -> Optional[TimeEntry]:
        """Gets currently running timer for user"""
        return self._time_entry_repository.get_running_timer(user_id)
    
    def get_entries_by_date_range(self, user_id: str, start_date: date, end_date: date) -> List[TimeEntry]:
        """Retrieves entries in date range"""
        return self._time_entry_repository.get_by_date_range(user_id, start_date, end_date)
    
    def get_entries_by_project(self, project_id: str, start_date: Optional[date] = None, 
                              end_date: Optional[date] = None) -> List[TimeEntry]:
        """Retrieves project-specific entries"""
        if start_date and end_date:
            return self._time_entry_repository.get_by_project_and_date_range(project_id, start_date, end_date)
        else:
            return self._time_entry_repository.get_by_project_id(project_id)
    
    def get_user_entries(self, user_id: str) -> List[TimeEntry]:
        """Get all time entries for a user"""
        return self._time_entry_repository.get_by_user_id(user_id)
    
    def duplicate_entry(self, entry_id: str, new_date: date) -> TimeEntry:
        """Creates copy of existing entry for new date"""
        original_entry = self._time_entry_repository.get_by_id(entry_id)
        if not original_entry:
            raise ValueError("Time entry not found")
        
        # Calculate new start and end times
        original_start = original_entry.start_time
        original_end = original_entry.end_time
        
        if not original_end:
            raise ValueError("Cannot duplicate running timer")
        
        # Calculate duration and apply to new date
        duration = original_end - original_start
        new_start = datetime.combine(new_date, original_start.time())
        new_end = new_start + duration
        
        # Check for overlap
        if self.validate_time_overlap(original_entry.user_id, new_start, new_end):
            raise ValueError("Duplicated entry would overlap with existing entry")
        
        # Create new entry
        return self.create_manual_entry(
            original_entry.user_id,
            original_entry.project_id,
            new_start,
            new_end,
            original_entry.description
        )
    
    def validate_time_overlap(self, user_id: str, start_time: datetime, end_time: datetime, 
                             exclude_entry_id: Optional[str] = None) -> bool:
        """Checks for overlapping times"""
        return self._time_entry_repository.check_overlap(user_id, start_time, end_time, exclude_entry_id)
    
    def get_entry_by_id(self, entry_id: str) -> Optional[TimeEntry]:
        """Get time entry by ID"""
        return self._time_entry_repository.get_by_id(entry_id)