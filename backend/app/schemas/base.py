from typing import Any
from pydantic import BaseModel, model_validator


def _assert_safe_string(s: str) -> str:
    """Raise ValueError for strings that asyncpg cannot encode (NUL bytes, lone surrogates).

    Plain String and ARRAY(String) columns use different asyncpg encoding paths;
    JSONB encoding uses a third path. None of them produce a consistent exception
    type that the global handlers in main.py can intercept. Validating at the
    Pydantic layer is the one reliable interception point.
    """
    if '\x00' in s:
        raise ValueError("String contains invalid NUL character")
    try:
        s.encode('utf-8')
    except UnicodeEncodeError:
        raise ValueError("String contains invalid character encoding")
    return s


def _validate_value_recursive(value: Any) -> None:
    """Recursively validate all strings in a value (str, list, dict)."""
    if isinstance(value, str):
        _assert_safe_string(value)
    elif isinstance(value, list):
        for item in value:
            _validate_value_recursive(item)
    elif isinstance(value, dict):
        for k, v in value.items():
            if isinstance(k, str):
                _assert_safe_string(k)
            _validate_value_recursive(v)


class SafeBaseModel(BaseModel):
    """BaseModel that rejects NUL bytes and lone surrogates in all str fields, including nested dicts."""

    @model_validator(mode='before')
    @classmethod
    def _validate_all_strings(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values
        for value in values.values():
            _validate_value_recursive(value)
        return values
