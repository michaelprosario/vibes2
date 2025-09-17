from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime, date
from app.core.entities.time_entry import TimeEntry

class ITimeEntryRepository(ABC):
    """
    Interface for time entry data access operations
    """
    
    @abstractmethod
    def create(self, time_entry: TimeEntry) -> TimeEntry:
        """Create a new time entry"""
        pass
    
    @abstractmethod
    def get_by_id(self, entry_id: str) -> Optional[TimeEntry]:
        """Get time entry by ID"""
        pass
    
    @abstractmethod
    def get_by_user_id(self, user_id: str) -> List[TimeEntry]:
        """Get all time entries for a user"""
        pass
    
    @abstractmethod
    def get_by_project_id(self, project_id: str) -> List[TimeEntry]:
        """Get all time entries for a project"""
        pass
    
    @abstractmethod
    def get_by_timesheet_id(self, timesheet_id: str) -> List[TimeEntry]:
        """Get all time entries for a timesheet"""
        pass
    
    @abstractmethod
    def get_running_timer(self, user_id: str) -> Optional[TimeEntry]:
        """Get currently running timer for a user"""
        pass
    
    @abstractmethod
    def get_by_date_range(self, user_id: str, start_date: date, end_date: date) -> List[TimeEntry]:
        """Get time entries within a date range for a user"""
        pass
    
    @abstractmethod
    def get_by_project_and_date_range(self, project_id: str, start_date: date, end_date: date) -> List[TimeEntry]:
        """Get time entries for a project within a date range"""
        pass
    
    @abstractmethod
    def check_overlap(self, user_id: str, start_time: datetime, end_time: datetime, exclude_entry_id: Optional[str] = None) -> bool:
        """Check if time range overlaps with existing entries"""
        pass
    
    @abstractmethod
    def update(self, time_entry: TimeEntry) -> TimeEntry:
        """Update existing time entry"""
        pass
    
    @abstractmethod
    def delete(self, entry_id: str) -> bool:
        """Delete time entry by ID"""
        pass
    
    @abstractmethod
    def list_all(self) -> List[TimeEntry]:
        """Get all time entries"""
        pass