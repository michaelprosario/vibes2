from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid

@dataclass
class TimeEntry:
    """
    Represents an individual work session
    """
    entry_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    project_id: str = ""
    timesheet_id: Optional[str] = None
    description: Optional[str] = None
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    duration_minutes: int = field(default=0, init=False)
    is_running: bool = field(default=False)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Calculate duration after initialization"""
        self.calculate_duration()
    
    def calculate_duration(self) -> None:
        """Calculate duration in minutes from start and end times"""
        if self.end_time and self.start_time:
            delta = self.end_time - self.start_time
            self.duration_minutes = int(delta.total_seconds() / 60)
        else:
            self.duration_minutes = 0
    
    def start_timer(self) -> None:
        """Start the timer"""
        self.start_time = datetime.now()
        self.end_time = None
        self.is_running = True
        self.updated_at = datetime.now()
        self.calculate_duration()
    
    def stop_timer(self) -> None:
        """Stop the timer"""
        if self.is_running:
            self.end_time = datetime.now()
            self.is_running = False
            self.updated_at = datetime.now()
            self.calculate_duration()
    
    def validate_times(self) -> bool:
        """Validate time business rules"""
        # Start time cannot be in the future
        if self.start_time > datetime.now():
            return False
        
        # End time must be after start time
        if self.end_time and self.end_time <= self.start_time:
            return False
        
        return True
    
    def update_times(self, start_time: datetime, end_time: Optional[datetime] = None) -> None:
        """Update times with validation"""
        temp_start = start_time
        temp_end = end_time
        
        # Validate times
        if temp_start > datetime.now():
            raise ValueError("Start time cannot be in the future")
        
        if temp_end and temp_end <= temp_start:
            raise ValueError("End time must be after start time")
        
        self.start_time = temp_start
        self.end_time = temp_end
        self.is_running = end_time is None
        self.updated_at = datetime.now()
        self.calculate_duration()
    
    def get_duration_formatted(self) -> str:
        """Get duration in HH:MM format"""
        hours = self.duration_minutes // 60
        minutes = self.duration_minutes % 60
        return f"{hours:02d}:{minutes:02d}"
    
    def to_dict(self):
        """Convert time entry to dictionary for JSON serialization"""
        return {
            'entry_id': self.entry_id,
            'user_id': self.user_id,
            'project_id': self.project_id,
            'timesheet_id': self.timesheet_id,
            'description': self.description,
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration_minutes': self.duration_minutes,
            'is_running': self.is_running,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data):
        """Create time entry from dictionary"""
        end_time = None
        if data.get('end_time'):
            end_time = datetime.fromisoformat(data['end_time'])
        
        entry = cls(
            entry_id=data.get('entry_id', str(uuid.uuid4())),
            user_id=data.get('user_id', ''),
            project_id=data.get('project_id', ''),
            timesheet_id=data.get('timesheet_id'),
            description=data.get('description'),
            start_time=datetime.fromisoformat(data.get('start_time', datetime.now().isoformat())),
            end_time=end_time,
            is_running=data.get('is_running', False),
            created_at=datetime.fromisoformat(data.get('created_at', datetime.now().isoformat())),
            updated_at=datetime.fromisoformat(data.get('updated_at', datetime.now().isoformat()))
        )
        
        # Override calculated duration with stored value
        entry.duration_minutes = data.get('duration_minutes', 0)
        
        return entry