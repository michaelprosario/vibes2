from typing import List, Optional, Dict, Any
from datetime import date
from app.core.entities.timesheet import Timesheet, PeriodType, TimesheetStatus
from app.core.interfaces.timesheet_repository import ITimesheetRepository
from app.infrastructure.repositories.base_json_repository import BaseJsonRepository

class JsonTimesheetRepository(BaseJsonRepository[Timesheet], ITimesheetRepository):
    """
    JSON file-based implementation of timesheet repository
    """
    
    def __init__(self, data_dir: str):
        super().__init__(data_dir, "timesheets.json")
    
    def _to_entity(self, data: Dict[str, Any]) -> Timesheet:
        """Convert dictionary to Timesheet entity"""
        return Timesheet.from_dict(data)
    
    def _from_entity(self, entity: Timesheet) -> Dict[str, Any]:
        """Convert Timesheet entity to dictionary"""
        return entity.to_dict()
    
    def _get_id_field(self) -> str:
        """Get the ID field name"""
        return "timesheet_id"
    
    def _get_entity_id(self, entity: Timesheet) -> str:
        """Get ID from Timesheet entity"""
        return entity.timesheet_id
    
    def create(self, timesheet: Timesheet) -> Timesheet:
        """Create a new timesheet"""
        data = self._read_data()
        
        # Check if timesheet already exists
        if self._find_index(data, self._get_id_field(), timesheet.timesheet_id) != -1:
            raise ValueError(f"Timesheet with ID {timesheet.timesheet_id} already exists")
        
        data.append(self._from_entity(timesheet))
        self._write_data(data)
        return timesheet
    
    def get_by_id(self, timesheet_id: str) -> Optional[Timesheet]:
        """Get timesheet by ID"""
        data = self._read_data()
        index = self._find_index(data, self._get_id_field(), timesheet_id)
        
        if index != -1:
            return self._to_entity(data[index])
        return None
    
    def get_by_user_id(self, user_id: str) -> List[Timesheet]:
        """Get all timesheets for a user"""
        data = self._read_data()
        
        timesheets = []
        for item in data:
            if item.get('user_id') == user_id:
                timesheets.append(self._to_entity(item))
        
        # Sort by start_date descending
        timesheets.sort(key=lambda t: t.start_date, reverse=True)
        return timesheets
    
    def get_by_user_and_status(self, user_id: str, status: TimesheetStatus) -> List[Timesheet]:
        """Get timesheets by user and status"""
        data = self._read_data()
        
        timesheets = []
        for item in data:
            if (item.get('user_id') == user_id and 
                item.get('status') == status.value):
                timesheets.append(self._to_entity(item))
        
        # Sort by start_date descending
        timesheets.sort(key=lambda t: t.start_date, reverse=True)
        return timesheets
    
    def get_by_period(self, user_id: str, start_date: date, end_date: date) -> Optional[Timesheet]:
        """Get timesheet for a specific period"""
        data = self._read_data()
        
        for item in data:
            if item.get('user_id') == user_id:
                timesheet_start = date.fromisoformat(item.get('start_date', ''))
                timesheet_end = date.fromisoformat(item.get('end_date', ''))
                
                # Check if periods match exactly
                if timesheet_start == start_date and timesheet_end == end_date:
                    return self._to_entity(item)
        return None
    
    def check_period_overlap(self, user_id: str, start_date: date, end_date: date, 
                            exclude_timesheet_id: Optional[str] = None) -> bool:
        """Check if period overlaps with existing timesheets"""
        data = self._read_data()
        
        for item in data:
            if (item.get('user_id') == user_id and 
                item.get('timesheet_id') != exclude_timesheet_id):
                
                timesheet_start = date.fromisoformat(item.get('start_date', ''))
                timesheet_end = date.fromisoformat(item.get('end_date', ''))
                
                # Check for overlap
                if (start_date <= timesheet_end and end_date >= timesheet_start):
                    return True
        
        return False
    
    def get_by_date_range(self, user_id: str, start_date: date, end_date: date) -> List[Timesheet]:
        """Get timesheets that overlap with a date range"""
        data = self._read_data()
        
        timesheets = []
        for item in data:
            if item.get('user_id') == user_id:
                timesheet_start = date.fromisoformat(item.get('start_date', ''))
                timesheet_end = date.fromisoformat(item.get('end_date', ''))
                
                # Check for overlap
                if (start_date <= timesheet_end and end_date >= timesheet_start):
                    timesheets.append(self._to_entity(item))
        
        # Sort by start_date ascending
        timesheets.sort(key=lambda t: t.start_date)
        return timesheets
    
    def update(self, timesheet: Timesheet) -> Timesheet:
        """Update existing timesheet"""
        data = self._read_data()
        index = self._find_index(data, self._get_id_field(), timesheet.timesheet_id)
        
        if index == -1:
            raise ValueError(f"Timesheet with ID {timesheet.timesheet_id} not found")
        
        data[index] = self._from_entity(timesheet)
        self._write_data(data)
        return timesheet
    
    def delete(self, timesheet_id: str) -> bool:
        """Delete timesheet by ID"""
        data = self._read_data()
        index = self._find_index(data, self._get_id_field(), timesheet_id)
        
        if index != -1:
            data.pop(index)
            self._write_data(data)
            return True
        return False
    
    def list_all(self) -> List[Timesheet]:
        """Get all timesheets"""
        data = self._read_data()
        timesheets = [self._to_entity(item) for item in data]
        
        # Sort by start_date descending
        timesheets.sort(key=lambda t: t.start_date, reverse=True)
        return timesheets