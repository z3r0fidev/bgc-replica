from typing import Generic, List, Optional, TypeVar, Any
from pydantic import BaseModel

T = TypeVar("T")

class PaginationMetadata(BaseModel):
    has_next: bool
    next_cursor: Optional[str] = None
    count: int

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    metadata: PaginationMetadata
