from typing import List, Optional, Dict, Any
from app.core.entities.user import User
from app.core.interfaces.user_repository import IUserRepository
from app.infrastructure.repositories.base_json_repository import BaseJsonRepository

class JsonUserRepository(BaseJsonRepository[User], IUserRepository):
    """
    JSON file-based implementation of user repository
    """
    
    def __init__(self, data_dir: str):
        super().__init__(data_dir, "users.json")
    
    def _to_entity(self, data: Dict[str, Any]) -> User:
        """Convert dictionary to User entity"""
        return User.from_dict(data)
    
    def _from_entity(self, entity: User) -> Dict[str, Any]:
        """Convert User entity to dictionary"""
        return entity.to_dict()
    
    def _get_id_field(self) -> str:
        """Get the ID field name"""
        return "user_id"
    
    def _get_entity_id(self, entity: User) -> str:
        """Get ID from User entity"""
        return entity.user_id
    
    def create(self, user: User) -> User:
        """Create a new user"""
        data = self._read_data()
        
        # Check if user already exists
        if self._find_index(data, self._get_id_field(), user.user_id) != -1:
            raise ValueError(f"User with ID {user.user_id} already exists")
        
        # Check username uniqueness
        if user.username:
            for item in data:
                if item.get('username') == user.username:
                    raise ValueError(f"Username '{user.username}' already exists")
        
        data.append(self._from_entity(user))
        self._write_data(data)
        return user
    
    def get_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        data = self._read_data()
        index = self._find_index(data, self._get_id_field(), user_id)
        
        if index != -1:
            return self._to_entity(data[index])
        return None
    
    def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        data = self._read_data()
        
        for item in data:
            if item.get('username') == username:
                return self._to_entity(item)
        return None
    
    def update(self, user: User) -> User:
        """Update existing user"""
        data = self._read_data()
        index = self._find_index(data, self._get_id_field(), user.user_id)
        
        if index == -1:
            raise ValueError(f"User with ID {user.user_id} not found")
        
        # Check username uniqueness (excluding current user)
        if user.username:
            for i, item in enumerate(data):
                if i != index and item.get('username') == user.username:
                    raise ValueError(f"Username '{user.username}' already exists")
        
        data[index] = self._from_entity(user)
        self._write_data(data)
        return user
    
    def delete(self, user_id: str) -> bool:
        """Delete user by ID"""
        data = self._read_data()
        index = self._find_index(data, self._get_id_field(), user_id)
        
        if index != -1:
            data.pop(index)
            self._write_data(data)
            return True
        return False
    
    def list_all(self) -> List[User]:
        """Get all users"""
        data = self._read_data()
        return [self._to_entity(item) for item in data]