import json
import os
from typing import List, Dict, Any, TypeVar, Generic, Optional
from abc import ABC, abstractmethod

T = TypeVar('T')

class BaseJsonRepository(Generic[T], ABC):
    """
    Base class for JSON file-based repositories
    """
    
    def __init__(self, data_dir: str, filename: str):
        self.data_dir = data_dir
        self.filename = filename
        self.filepath = os.path.join(data_dir, filename)
        self._ensure_file_exists()
    
    def _ensure_file_exists(self) -> None:
        """Ensure the JSON file exists"""
        if not os.path.exists(self.filepath):
            with open(self.filepath, 'w') as f:
                json.dump([], f)
    
    def _read_data(self) -> List[Dict[str, Any]]:
        """Read data from JSON file"""
        try:
            with open(self.filepath, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    
    def _write_data(self, data: List[Dict[str, Any]]) -> None:
        """Write data to JSON file"""
        with open(self.filepath, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    
    def _find_index(self, data: List[Dict[str, Any]], id_field: str, id_value: str) -> int:
        """Find index of item by ID"""
        for i, item in enumerate(data):
            if item.get(id_field) == id_value:
                return i
        return -1
    
    @abstractmethod
    def _to_entity(self, data: Dict[str, Any]) -> T:
        """Convert dictionary to entity"""
        pass
    
    @abstractmethod
    def _from_entity(self, entity: T) -> Dict[str, Any]:
        """Convert entity to dictionary"""
        pass
    
    @abstractmethod
    def _get_id_field(self) -> str:
        """Get the ID field name for the entity"""
        pass
    
    @abstractmethod
    def _get_entity_id(self, entity: T) -> str:
        """Get ID from entity"""
        pass