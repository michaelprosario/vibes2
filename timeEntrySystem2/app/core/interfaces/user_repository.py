from abc import ABC, abstractmethod
from typing import List, Optional
from app.core.entities.user import User

class IUserRepository(ABC):
    """
    Interface for user data access operations
    """
    
    @abstractmethod
    def create(self, user: User) -> User:
        """Create a new user"""
        pass
    
    @abstractmethod
    def get_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        pass
    
    @abstractmethod
    def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        pass
    
    @abstractmethod
    def update(self, user: User) -> User:
        """Update existing user"""
        pass
    
    @abstractmethod
    def delete(self, user_id: str) -> bool:
        """Delete user by ID"""
        pass
    
    @abstractmethod
    def list_all(self) -> List[User]:
        """Get all users"""
        pass