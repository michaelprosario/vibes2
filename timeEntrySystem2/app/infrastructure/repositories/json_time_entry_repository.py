from typing import List, Optional, Dict, Any
from datetime import datetime, date
from app.core.entities.time_entry import TimeEntry
from app.core.interfaces.time_entry_repository import ITimeEntryRepository
from app.infrastructure.repositories.base_json_repository import BaseJsonRepository

class JsonTimeEntryRepository(BaseJsonRepository[TimeEntry], ITimeEntryRepository):
    """
    JSON file-based implementation of time entry repository
    """
    
    def __init__(self, data_dir: str):
        super().__init__(data_dir, "time_entries.json")
    
    def _to_entity(self, data: Dict[str, Any]) -> TimeEntry:
        """Convert dictionary to TimeEntry entity"""
        return TimeEntry.from_dict(data)
    
    def _from_entity(self, entity: TimeEntry) -> Dict[str, Any]:
        """Convert TimeEntry entity to dictionary"""
        return entity.to_dict()
    
    def _get_id_field(self) -> str:
        """Get the ID field name"""
        return "entry_id"
    
    def _get_entity_id(self, entity: TimeEntry) -> str:
        """Get ID from TimeEntry entity"""
        return entity.entry_id
    
    def create(self, time_entry: TimeEntry) -> TimeEntry:
        """Create a new time entry"""
        data = self._read_data()
        
        # Check if time entry already exists
        if self._find_index(data, self._get_id_field(), time_entry.entry_id) != -1:
            raise ValueError(f"Time entry with ID {time_entry.entry_id} already exists")
        
        data.append(self._from_entity(time_entry))
        self._write_data(data)
        return time_entry
    
    def get_by_id(self, entry_id: str) -> Optional[TimeEntry]:
        """Get time entry by ID"""
        data = self._read_data()
        index = self._find_index(data, self._get_id_field(), entry_id)
        
        if index != -1:
            return self._to_entity(data[index])
        return None
    
    def get_by_user_id(self, user_id: str) -> List[TimeEntry]:
        """Get all time entries for a user"""
        data = self._read_data()
        
        entries = []
        for item in data:
            if item.get('user_id') == user_id:
                entries.append(self._to_entity(item))
        
        # Sort by start_time descending
        entries.sort(key=lambda e: e.start_time, reverse=True)
        return entries
    
    def get_by_project_id(self, project_id: str) -> List[TimeEntry]:
        """Get all time entries for a project"""
        data = self._read_data()
        
        entries = []
        for item in data:
            if item.get('project_id') == project_id:
                entries.append(self._to_entity(item))
        
        # Sort by start_time descending
        entries.sort(key=lambda e: e.start_time, reverse=True)
        return entries
    
    def get_by_timesheet_id(self, timesheet_id: str) -> List[TimeEntry]:
        """Get all time entries for a timesheet"""
        data = self._read_data()
        
        entries = []
        for item in data:
            if item.get('timesheet_id') == timesheet_id:
                entries.append(self._to_entity(item))
        
        # Sort by start_time ascending for timesheet view
        entries.sort(key=lambda e: e.start_time)
        return entries
    
    def get_running_timer(self, user_id: str) -> Optional[TimeEntry]:
        """Get currently running timer for a user"""
        data = self._read_data()
        
        for item in data:
            if (item.get('user_id') == user_id and 
                item.get('is_running') is True):
                return self._to_entity(item)
        return None
    
    def get_by_date_range(self, user_id: str, start_date: date, end_date: date) -> List[TimeEntry]:
        """Get time entries within a date range for a user"""
        data = self._read_data()
        
        entries = []
        for item in data:
            if item.get('user_id') == user_id:
                entry_date = datetime.fromisoformat(item.get('start_time', '')).date()
                if start_date <= entry_date <= end_date:
                    entries.append(self._to_entity(item))
        
        # Sort by start_time ascending
        entries.sort(key=lambda e: e.start_time)
        return entries
    
    def get_by_project_and_date_range(self, project_id: str, start_date: date, end_date: date) -> List[TimeEntry]:
        """Get time entries for a project within a date range"""
        data = self._read_data()
        
        entries = []
        for item in data:
            if item.get('project_id') == project_id:
                entry_date = datetime.fromisoformat(item.get('start_time', '')).date()
                if start_date <= entry_date <= end_date:
                    entries.append(self._to_entity(item))
        
        # Sort by start_time ascending
        entries.sort(key=lambda e: e.start_time)
        return entries
    
    def check_overlap(self, user_id: str, start_time: datetime, end_time: datetime, 
                     exclude_entry_id: Optional[str] = None) -> bool:
        """Check if time range overlaps with existing entries"""
        data = self._read_data()
        
        for item in data:
            if (item.get('user_id') == user_id and 
                item.get('entry_id') != exclude_entry_id):
                
                entry_start = datetime.fromisoformat(item.get('start_time', ''))
                entry_end_str = item.get('end_time')
                
                # Skip running timers or entries without end time
                if not entry_end_str:
                    continue
                
                entry_end = datetime.fromisoformat(entry_end_str)
                
                # Check for overlap
                if (start_time < entry_end and end_time > entry_start):
                    return True
        
        return False
    
    def update(self, time_entry: TimeEntry) -> TimeEntry:
        """Update existing time entry"""
        data = self._read_data()
        index = self._find_index(data, self._get_id_field(), time_entry.entry_id)
        
        if index == -1:
            raise ValueError(f"Time entry with ID {time_entry.entry_id} not found")
        
        data[index] = self._from_entity(time_entry)
        self._write_data(data)
        return time_entry
    
    def delete(self, entry_id: str) -> bool:
        """Delete time entry by ID"""
        data = self._read_data()
        index = self._find_index(data, self._get_id_field(), entry_id)
        
        if index != -1:
            data.pop(index)
            self._write_data(data)
            return True
        return False
    
    def list_all(self) -> List[TimeEntry]:
        """Get all time entries"""
        data = self._read_data()
        entries = [self._to_entity(item) for item in data]
        
        # Sort by start_time descending
        entries.sort(key=lambda e: e.start_time, reverse=True)
        return entries