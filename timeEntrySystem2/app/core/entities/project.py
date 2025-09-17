from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Optional
from enum import Enum
import uuid

class ProjectStatus(Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"

@dataclass
class Project:
    """
    Represents a work project or client initiative
    """
    project_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    name: str = ""
    description: Optional[str] = None
    color_code: Optional[str] = None
    status: ProjectStatus = ProjectStatus.ACTIVE
    deadline: Optional[date] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def update_status(self, new_status: ProjectStatus) -> None:
        """Update project status with business rules"""
        # Business rule: Status transitions
        if self.status == ProjectStatus.ARCHIVED and new_status != ProjectStatus.ARCHIVED:
            # Allow unarchiving
            pass
        self.status = new_status
        self.updated_at = datetime.now()
    
    def archive(self) -> None:
        """Archive the project"""
        self.update_status(ProjectStatus.ARCHIVED)
    
    def is_archived(self) -> bool:
        """Check if project is archived"""
        return self.status == ProjectStatus.ARCHIVED
    
    def validate_color_code(self, color_code: str) -> bool:
        """Validate hex color code"""
        if not color_code:
            return True
        if not color_code.startswith('#'):
            return False
        if len(color_code) != 7:
            return False
        try:
            int(color_code[1:], 16)
            return True
        except ValueError:
            return False
    
    def set_color_code(self, color_code: Optional[str]) -> None:
        """Set color code with validation"""
        if color_code and not self.validate_color_code(color_code):
            raise ValueError("Invalid hex color code")
        self.color_code = color_code
        self.updated_at = datetime.now()
    
    def to_dict(self):
        """Convert project to dictionary for JSON serialization"""
        return {
            'project_id': self.project_id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'color_code': self.color_code,
            'status': self.status.value,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data):
        """Create project from dictionary"""
        deadline = None
        if data.get('deadline'):
            deadline = date.fromisoformat(data['deadline'])
            
        return cls(
            project_id=data.get('project_id', str(uuid.uuid4())),
            user_id=data.get('user_id', ''),
            name=data.get('name', ''),
            description=data.get('description'),
            color_code=data.get('color_code'),
            status=ProjectStatus(data.get('status', 'active')),
            deadline=deadline,
            created_at=datetime.fromisoformat(data.get('created_at', datetime.now().isoformat())),
            updated_at=datetime.fromisoformat(data.get('updated_at', datetime.now().isoformat()))
        )