from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import date
from app.core.entities.timesheet import Timesheet, PeriodType, TimesheetStatus

class ITimesheetRepository(ABC):
    """
    Interface for timesheet data access operations
    """
    
    @abstractmethod
    def create(self, timesheet: Timesheet) -> Timesheet:
        """Create a new timesheet"""
        pass
    
    @abstractmethod
    def get_by_id(self, timesheet_id: str) -> Optional[Timesheet]:
        """Get timesheet by ID"""
        pass
    
    @abstractmethod
    def get_by_user_id(self, user_id: str) -> List[Timesheet]:
        """Get all timesheets for a user"""
        pass
    
    @abstractmethod
    def get_by_user_and_status(self, user_id: str, status: TimesheetStatus) -> List[Timesheet]:
        """Get timesheets by user and status"""
        pass
    
    @abstractmethod
    def get_by_period(self, user_id: str, start_date: date, end_date: date) -> Optional[Timesheet]:
        """Get timesheet for a specific period"""
        pass
    
    @abstractmethod
    def check_period_overlap(self, user_id: str, start_date: date, end_date: date, exclude_timesheet_id: Optional[str] = None) -> bool:
        """Check if period overlaps with existing timesheets"""
        pass
    
    @abstractmethod
    def get_by_date_range(self, user_id: str, start_date: date, end_date: date) -> List[Timesheet]:
        """Get timesheets that overlap with a date range"""
        pass
    
    @abstractmethod
    def update(self, timesheet: Timesheet) -> Timesheet:
        """Update existing timesheet"""
        pass
    
    @abstractmethod
    def delete(self, timesheet_id: str) -> bool:
        """Delete timesheet by ID"""
        pass
    
    @abstractmethod
    def list_all(self) -> List[Timesheet]:
        """Get all timesheets"""
        pass