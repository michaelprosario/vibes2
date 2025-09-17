from dataclasses import dataclass, field
from datetime import datetime, date
from typing import List, Optional
from enum import Enum
import uuid

class PeriodType(Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"

class TimesheetStatus(Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"

@dataclass
class Timesheet:
    """
    Groups time entries for specific periods and reporting
    """
    timesheet_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    name: str = ""
    period_type: PeriodType = PeriodType.WEEKLY
    start_date: date = field(default_factory=date.today)
    end_date: date = field(default_factory=date.today)
    status: TimesheetStatus = TimesheetStatus.DRAFT
    total_hours: float = field(default=0.0, init=False)
    entry_ids: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def validate_dates(self) -> bool:
        """Validate date business rules"""
        return self.end_date >= self.start_date
    
    def update_dates(self, start_date: date, end_date: date) -> None:
        """Update dates with validation"""
        if end_date < start_date:
            raise ValueError("End date must be after or equal to start date")
        
        self.start_date = start_date
        self.end_date = end_date
        self.updated_at = datetime.now()
    
    def submit(self) -> None:
        """Submit timesheet for approval"""
        if self.status == TimesheetStatus.DRAFT:
            self.status = TimesheetStatus.SUBMITTED
            self.updated_at = datetime.now()
        else:
            raise ValueError("Only draft timesheets can be submitted")
    
    def approve(self) -> None:
        """Approve timesheet"""
        if self.status == TimesheetStatus.SUBMITTED:
            self.status = TimesheetStatus.APPROVED
            self.updated_at = datetime.now()
        else:
            raise ValueError("Only submitted timesheets can be approved")
    
    def revert_to_draft(self) -> None:
        """Revert timesheet back to draft status"""
        if self.status in [TimesheetStatus.SUBMITTED, TimesheetStatus.APPROVED]:
            self.status = TimesheetStatus.DRAFT
            self.updated_at = datetime.now()
    
    def is_locked(self) -> bool:
        """Check if timesheet is locked for editing"""
        return self.status in [TimesheetStatus.SUBMITTED, TimesheetStatus.APPROVED]
    
    def add_entry(self, entry_id: str) -> None:
        """Add time entry to timesheet"""
        if self.is_locked():
            raise ValueError("Cannot modify locked timesheet")
        
        if entry_id not in self.entry_ids:
            self.entry_ids.append(entry_id)
            self.updated_at = datetime.now()
    
    def remove_entry(self, entry_id: str) -> None:
        """Remove time entry from timesheet"""
        if self.is_locked():
            raise ValueError("Cannot modify locked timesheet")
        
        if entry_id in self.entry_ids:
            self.entry_ids.remove(entry_id)
            self.updated_at = datetime.now()
    
    def calculate_total_hours(self, time_entries: List) -> None:
        """Calculate total hours from associated time entries"""
        total_minutes = sum(entry.duration_minutes for entry in time_entries 
                          if entry.entry_id in self.entry_ids)
        self.total_hours = round(total_minutes / 60.0, 2)
        self.updated_at = datetime.now()
    
    def get_period_description(self) -> str:
        """Get human-readable period description"""
        if self.period_type == PeriodType.DAILY:
            return f"Daily - {self.start_date.strftime('%Y-%m-%d')}"
        elif self.period_type == PeriodType.WEEKLY:
            return f"Weekly - {self.start_date.strftime('%Y-%m-%d')} to {self.end_date.strftime('%Y-%m-%d')}"
        elif self.period_type == PeriodType.MONTHLY:
            return f"Monthly - {self.start_date.strftime('%B %Y')}"
        else:
            return f"Custom - {self.start_date.strftime('%Y-%m-%d')} to {self.end_date.strftime('%Y-%m-%d')}"
    
    def to_dict(self):
        """Convert timesheet to dictionary for JSON serialization"""
        return {
            'timesheet_id': self.timesheet_id,
            'user_id': self.user_id,
            'name': self.name,
            'period_type': self.period_type.value,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'status': self.status.value,
            'total_hours': self.total_hours,
            'entry_ids': self.entry_ids,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data):
        """Create timesheet from dictionary"""
        timesheet = cls(
            timesheet_id=data.get('timesheet_id', str(uuid.uuid4())),
            user_id=data.get('user_id', ''),
            name=data.get('name', ''),
            period_type=PeriodType(data.get('period_type', 'weekly')),
            start_date=date.fromisoformat(data.get('start_date', date.today().isoformat())),
            end_date=date.fromisoformat(data.get('end_date', date.today().isoformat())),
            status=TimesheetStatus(data.get('status', 'draft')),
            entry_ids=data.get('entry_ids', []),
            created_at=datetime.fromisoformat(data.get('created_at', datetime.now().isoformat())),
            updated_at=datetime.fromisoformat(data.get('updated_at', datetime.now().isoformat()))
        )
        
        # Override calculated total_hours with stored value
        timesheet.total_hours = data.get('total_hours', 0.0)
        
        return timesheet