from typing import Dict, Any, Optional
from app.core.entities.user import User
from app.core.interfaces.user_repository import IUserRepository
import json
import os

class UserPreferencesService:
    """
    Manages user settings and preferences
    """
    
    def __init__(self, user_repository: IUserRepository):
        self._user_repository = user_repository
    
    def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Retrieves user preferences"""
        user = self._user_repository.get_by_id(user_id)
        if not user:
            # Create default user if not exists
            user = self.create_default_user(user_id)
        
        return user.preferences
    
    def update_preferences(self, user_id: str, preferences: Dict[str, Any]) -> User:
        """Updates user preferences"""
        user = self._user_repository.get_by_id(user_id)
        if not user:
            user = self.create_default_user(user_id)
        
        user.update_preferences(preferences)
        return self._user_repository.update(user)
    
    def set_default_project(self, user_id: str, project_id: str) -> User:
        """Sets default project for new entries"""
        preferences = {'default_project_id': project_id}
        return self.update_preferences(user_id, preferences)
    
    def configure_keyboard_shortcuts(self, user_id: str, shortcuts: Dict[str, str]) -> User:
        """Configures custom keyboard shortcuts"""
        preferences = {'keyboard_shortcuts': shortcuts}
        return self.update_preferences(user_id, preferences)
    
    def set_ui_preferences(self, user_id: str, ui_prefs: Dict[str, Any]) -> User:
        """Set UI preferences like theme, layout, etc."""
        preferences = {'ui_preferences': ui_prefs}
        return self.update_preferences(user_id, preferences)
    
    def backup_user_data(self, user_id: str) -> str:
        """Creates data backup for user"""
        # This would typically create a comprehensive backup
        # For now, we'll just return the user preferences as JSON
        user = self._user_repository.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        
        backup_data = {
            'user_id': user_id,
            'preferences': user.preferences,
            'backup_timestamp': user.updated_at.isoformat()
        }
        
        return json.dumps(backup_data, indent=2)
    
    def restore_user_data(self, user_id: str, backup_data: str) -> User:
        """Restores user data from backup"""
        try:
            data = json.loads(backup_data)
            preferences = data.get('preferences', {})
            return self.update_preferences(user_id, preferences)
        except json.JSONDecodeError:
            raise ValueError("Invalid backup data format")
    
    def import_time_data(self, user_id: str, import_data: str, format_type: str) -> Dict[str, Any]:
        """Imports data from external systems"""
        # This is a placeholder for import functionality
        # In a real implementation, you'd parse different formats (CSV, JSON, etc.)
        # and create time entries accordingly
        
        if format_type not in ['csv', 'json']:
            raise ValueError("Unsupported import format")
        
        # For now, just return a summary
        return {
            'status': 'success',
            'message': f'Import from {format_type} format initiated',
            'entries_imported': 0,
            'errors': []
        }
    
    def create_default_user(self, user_id: str) -> User:
        """Create a user with default preferences"""
        default_preferences = {
            'theme': 'light',
            'default_project_id': None,
            'time_format': '24h',
            'date_format': 'YYYY-MM-DD',
            'auto_start_timer': False,
            'reminder_notifications': True,
            'keyboard_shortcuts': {
                'start_timer': 'Ctrl+S',
                'stop_timer': 'Ctrl+T',
                'new_project': 'Ctrl+N',
                'new_timesheet': 'Ctrl+Shift+N'
            },
            'ui_preferences': {
                'show_seconds': False,
                'compact_view': False,
                'group_by_project': True,
                'default_view': 'daily'
            }
        }
        
        user = User(
            user_id=user_id,
            username=f"User_{user_id[:8]}",
            preferences=default_preferences
        )
        
        return self._user_repository.create(user)
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self._user_repository.get_by_id(user_id)
    
    def create_user(self, username: str, email: Optional[str] = None) -> User:
        """Create a new user"""
        # Check if username already exists
        existing_user = self._user_repository.get_by_username(username)
        if existing_user:
            raise ValueError(f"Username '{username}' already exists")
        
        user = User(username=username, email=email)
        user.preferences = self.create_default_user(user.user_id).preferences
        
        return self._user_repository.create(user)