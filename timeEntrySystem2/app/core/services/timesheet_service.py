from typing import List, Optional
from datetime import date
from app.core.entities.timesheet import Timesheet, PeriodType, TimesheetStatus
from app.core.interfaces.timesheet_repository import ITimesheetRepository
from app.core.interfaces.time_entry_repository import ITimeEntryRepository

class TimesheetService:
    """
    Manages timesheet creation and operations
    """
    
    def __init__(self, timesheet_repository: ITimesheetRepository, time_entry_repository: ITimeEntryRepository):
        self._timesheet_repository = timesheet_repository
        self._time_entry_repository = time_entry_repository
    
    def create_timesheet(self, user_id: str, name: str, period_type: PeriodType, 
                        start_date: date, end_date: date) -> Timesheet:
        """Creates new timesheet with validation"""
        # Validate period overlap
        if self.validate_period_overlap(user_id, start_date, end_date):
            raise ValueError("Timesheet period overlaps with existing timesheet")
        
        # Create timesheet
        timesheet = Timesheet(
            user_id=user_id,
            name=name,
            period_type=period_type,
            start_date=start_date,
            end_date=end_date
        )
        
        created_timesheet = self._timesheet_repository.create(timesheet)
        
        # Auto-add relevant time entries
        self._auto_add_entries(created_timesheet)
        
        return created_timesheet
    
    def add_entries_to_timesheet(self, timesheet_id: str, entry_ids: List[str]) -> Timesheet:
        """Associates entries with timesheet"""
        timesheet = self._timesheet_repository.get_by_id(timesheet_id)
        if not timesheet:
            raise ValueError("Timesheet not found")
        
        if timesheet.is_locked():
            raise ValueError("Cannot modify locked timesheet")
        
        # Add entries
        for entry_id in entry_ids:
            timesheet.add_entry(entry_id)
        
        # Recalculate totals
        self.calculate_timesheet_totals(timesheet_id)
        
        return self._timesheet_repository.update(timesheet)
    
    def remove_entries_from_timesheet(self, timesheet_id: str, entry_ids: List[str]) -> Timesheet:
        """Removes entries from timesheet"""
        timesheet = self._timesheet_repository.get_by_id(timesheet_id)
        if not timesheet:
            raise ValueError("Timesheet not found")
        
        if timesheet.is_locked():
            raise ValueError("Cannot modify locked timesheet")
        
        # Remove entries
        for entry_id in entry_ids:
            timesheet.remove_entry(entry_id)
        
        # Recalculate totals
        self.calculate_timesheet_totals(timesheet_id)
        
        return self._timesheet_repository.update(timesheet)
    
    def calculate_timesheet_totals(self, timesheet_id: str) -> Timesheet:
        """Recalculates total hours for timesheet"""
        timesheet = self._timesheet_repository.get_by_id(timesheet_id)
        if not timesheet:
            raise ValueError("Timesheet not found")
        
        # Get all time entries for this timesheet
        time_entries = []
        for entry_id in timesheet.entry_ids:
            entry = self._time_entry_repository.get_by_id(entry_id)
            if entry:
                time_entries.append(entry)
        
        timesheet.calculate_total_hours(time_entries)
        return self._timesheet_repository.update(timesheet)
    
    def submit_timesheet(self, timesheet_id: str) -> Timesheet:
        """Marks timesheet as submitted"""
        timesheet = self._timesheet_repository.get_by_id(timesheet_id)
        if not timesheet:
            raise ValueError("Timesheet not found")
        
        timesheet.submit()
        return self._timesheet_repository.update(timesheet)
    
    def approve_timesheet(self, timesheet_id: str) -> Timesheet:
        """Marks timesheet as approved"""
        timesheet = self._timesheet_repository.get_by_id(timesheet_id)
        if not timesheet:
            raise ValueError("Timesheet not found")
        
        timesheet.approve()
        return self._timesheet_repository.update(timesheet)
    
    def revert_timesheet(self, timesheet_id: str) -> Timesheet:
        """Reverts timesheet to draft status"""
        timesheet = self._timesheet_repository.get_by_id(timesheet_id)
        if not timesheet:
            raise ValueError("Timesheet not found")
        
        timesheet.revert_to_draft()
        return self._timesheet_repository.update(timesheet)
    
    def get_timesheet_by_period(self, user_id: str, start_date: date, end_date: date) -> Optional[Timesheet]:
        """Finds timesheet for specific period"""
        return self._timesheet_repository.get_by_period(user_id, start_date, end_date)
    
    def get_user_timesheets(self, user_id: str) -> List[Timesheet]:
        """Get all timesheets for a user"""
        return self._timesheet_repository.get_by_user_id(user_id)
    
    def get_timesheet_by_id(self, timesheet_id: str) -> Optional[Timesheet]:
        """Get timesheet by ID"""
        return self._timesheet_repository.get_by_id(timesheet_id)
    
    def validate_period_overlap(self, user_id: str, start_date: date, end_date: date, 
                               exclude_timesheet_id: Optional[str] = None) -> bool:
        """Checks for overlapping periods"""
        return self._timesheet_repository.check_period_overlap(user_id, start_date, end_date, exclude_timesheet_id)
    
    def update_timesheet(self, timesheet_id: str, **kwargs) -> Timesheet:
        """Update timesheet details"""
        timesheet = self._timesheet_repository.get_by_id(timesheet_id)
        if not timesheet:
            raise ValueError("Timesheet not found")
        
        # Check if dates are being updated
        if 'start_date' in kwargs or 'end_date' in kwargs:
            new_start = kwargs.get('start_date', timesheet.start_date)
            new_end = kwargs.get('end_date', timesheet.end_date)
            
            if self.validate_period_overlap(timesheet.user_id, new_start, new_end, timesheet_id):
                raise ValueError("Updated period would overlap with existing timesheet")
            
            timesheet.update_dates(new_start, new_end)
        
        # Update other fields
        for field, value in kwargs.items():
            if field not in ['start_date', 'end_date'] and hasattr(timesheet, field):
                setattr(timesheet, field, value)
        
        return self._timesheet_repository.update(timesheet)
    
    def delete_timesheet(self, timesheet_id: str) -> bool:
        """Delete timesheet"""
        timesheet = self._timesheet_repository.get_by_id(timesheet_id)
        if not timesheet:
            raise ValueError("Timesheet not found")
        
        if timesheet.is_locked():
            raise ValueError("Cannot delete locked timesheet")
        
        return self._timesheet_repository.delete(timesheet_id)
    
    def _auto_add_entries(self, timesheet: Timesheet) -> None:
        """Automatically add relevant time entries to timesheet"""
        # Get time entries in the timesheet period
        time_entries = self._time_entry_repository.get_by_date_range(
            timesheet.user_id, timesheet.start_date, timesheet.end_date)
        
        # Add entries that don't already belong to another timesheet
        for entry in time_entries:
            if not entry.timesheet_id:  # Entry not assigned to any timesheet
                timesheet.add_entry(entry.entry_id)
                # Update the time entry to reference this timesheet
                entry.timesheet_id = timesheet.timesheet_id
                self._time_entry_repository.update(entry)
        
        # Calculate totals
        timesheet.calculate_total_hours(time_entries)
        self._timesheet_repository.update(timesheet)