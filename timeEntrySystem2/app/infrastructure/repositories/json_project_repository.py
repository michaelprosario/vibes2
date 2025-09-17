from typing import List, Optional, Dict, Any
from app.core.entities.project import Project, ProjectStatus
from app.core.interfaces.project_repository import IProjectRepository
from app.infrastructure.repositories.base_json_repository import BaseJsonRepository

class JsonProjectRepository(BaseJsonRepository[Project], IProjectRepository):
    """
    JSON file-based implementation of project repository
    """
    
    def __init__(self, data_dir: str):
        super().__init__(data_dir, "projects.json")
    
    def _to_entity(self, data: Dict[str, Any]) -> Project:
        """Convert dictionary to Project entity"""
        return Project.from_dict(data)
    
    def _from_entity(self, entity: Project) -> Dict[str, Any]:
        """Convert Project entity to dictionary"""
        return entity.to_dict()
    
    def _get_id_field(self) -> str:
        """Get the ID field name"""
        return "project_id"
    
    def _get_entity_id(self, entity: Project) -> str:
        """Get ID from Project entity"""
        return entity.project_id
    
    def create(self, project: Project) -> Project:
        """Create a new project"""
        data = self._read_data()
        
        # Check if project already exists
        if self._find_index(data, self._get_id_field(), project.project_id) != -1:
            raise ValueError(f"Project with ID {project.project_id} already exists")
        
        # Check name uniqueness for user
        for item in data:
            if (item.get('user_id') == project.user_id and 
                item.get('name') == project.name):
                raise ValueError(f"Project name '{project.name}' already exists for this user")
        
        data.append(self._from_entity(project))
        self._write_data(data)
        return project
    
    def get_by_id(self, project_id: str) -> Optional[Project]:
        """Get project by ID"""
        data = self._read_data()
        index = self._find_index(data, self._get_id_field(), project_id)
        
        if index != -1:
            return self._to_entity(data[index])
        return None
    
    def get_by_user_id(self, user_id: str) -> List[Project]:
        """Get all projects for a user"""
        data = self._read_data()
        
        projects = []
        for item in data:
            if item.get('user_id') == user_id:
                projects.append(self._to_entity(item))
        
        # Sort by created_at descending
        projects.sort(key=lambda p: p.created_at, reverse=True)
        return projects
    
    def get_by_user_and_status(self, user_id: str, status: ProjectStatus) -> List[Project]:
        """Get projects by user and status"""
        data = self._read_data()
        
        projects = []
        for item in data:
            if (item.get('user_id') == user_id and 
                item.get('status') == status.value):
                projects.append(self._to_entity(item))
        
        # Sort by created_at descending
        projects.sort(key=lambda p: p.created_at, reverse=True)
        return projects
    
    def get_by_name(self, user_id: str, name: str) -> Optional[Project]:
        """Get project by user and name"""
        data = self._read_data()
        
        for item in data:
            if (item.get('user_id') == user_id and 
                item.get('name') == name):
                return self._to_entity(item)
        return None
    
    def update(self, project: Project) -> Project:
        """Update existing project"""
        data = self._read_data()
        index = self._find_index(data, self._get_id_field(), project.project_id)
        
        if index == -1:
            raise ValueError(f"Project with ID {project.project_id} not found")
        
        # Check name uniqueness for user (excluding current project)
        for i, item in enumerate(data):
            if (i != index and 
                item.get('user_id') == project.user_id and 
                item.get('name') == project.name):
                raise ValueError(f"Project name '{project.name}' already exists for this user")
        
        data[index] = self._from_entity(project)
        self._write_data(data)
        return project
    
    def delete(self, project_id: str) -> bool:
        """Delete project by ID"""
        data = self._read_data()
        index = self._find_index(data, self._get_id_field(), project_id)
        
        if index != -1:
            data.pop(index)
            self._write_data(data)
            return True
        return False
    
    def list_all(self) -> List[Project]:
        """Get all projects"""
        data = self._read_data()
        projects = [self._to_entity(item) for item in data]
        
        # Sort by created_at descending
        projects.sort(key=lambda p: p.created_at, reverse=True)
        return projects