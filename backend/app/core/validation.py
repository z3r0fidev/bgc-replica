"""Shared validation utilities for query parameters."""
from typing import Any
from fastapi import HTTPException, status
from app.schemas.base import _assert_safe_string


def validate_query_params(**params: Any) -> None:
    """
    Validate query parameters for unsafe characters.

    Raises HTTPException with 422 status if any string param contains:
    - NUL bytes (\\x00)
    - Lone surrogates (Unicode 0xD800-0xDFFF)

    Usage:
        validate_query_params(query=query, category=category, cursor=cursor)
    """
    try:
        for param_name, param_value in params.items():
            if param_value is None:
                continue

            if isinstance(param_value, str):
                _assert_safe_string(param_value)
            elif isinstance(param_value, list):
                for item in param_value:
                    if isinstance(item, str):
                        _assert_safe_string(item)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid query parameter: {e}"
        )


def escape_like(value: str) -> str:
    """
    Escape SQL LIKE wildcard characters to prevent pattern injection.

    Escapes: \\ % _

    Always use with escape="\\\\" in SQLAlchemy ILIKE/LIKE operations.
    """
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
