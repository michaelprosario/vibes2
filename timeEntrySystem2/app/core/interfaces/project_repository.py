from abc import ABC, abstractmethod
from typing import List, Optional
from app.core.entities.project import Project, ProjectStatus

class IProjectRepository(ABC):
    """
    Interface for project data access operations
    """
    
    @abstractmethod
    def create(self, project: Project) -> Project:
        """Create a new project"""
        pass
    
    @abstractmethod
    def get_by_id(self, project_id: str) -> Optional[Project]:
        """Get project by ID"""
        pass
    
    @abstractmethod
    def get_by_user_id(self, user_id: str) -> List[Project]:
        """Get all projects for a user"""
        pass
    
    @abstractmethod
    def get_by_user_and_status(self, user_id: str, status: ProjectStatus) -> List[Project]:
        """Get projects by user and status"""
        pass
    
    @abstractmethod
    def get_by_name(self, user_id: str, name: str) -> Optional[Project]:
        """Get project by user and name"""
        pass
    
    @abstractmethod
    def update(self, project: Project) -> Project:
        """Update existing project"""
        pass
    
    @abstractmethod
    def delete(self, project_id: str) -> bool:
        """Delete project by ID"""
        pass
    
    @abstractmethod
    def list_all(self) -> List[Project]:
        """Get all projects"""
        pass