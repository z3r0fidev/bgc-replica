from typing import Any, Dict, Optional
from fastapi import HTTPException, status

class BaseAppException(HTTPException):
    code: int = 1000
    detail: str = "An unexpected error occurred."
    
    def __init__(self, detail: Optional[str] = None, code: Optional[int] = None):
        super().__init__(
            status_code=self.status_code if hasattr(self, "status_code") else status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail or self.detail
        )
        if code:
            self.code = code

class AuthException(BaseAppException):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = 1100
    detail = "Authentication failed."

class NotFoundException(BaseAppException):
    status_code = status.HTTP_404_NOT_FOUND
    code = 1200
    detail = "Resource not found."

class ValidationException(BaseAppException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = 1300
    detail = "Validation error."

class RateLimitException(BaseAppException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = 1400
    detail = "Rate limit exceeded."

class DatabaseException(BaseAppException):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    code = 1500
    detail = "Database error."
