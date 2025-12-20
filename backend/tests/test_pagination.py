import pytest
from app.core.pagination import encode_cursor, decode_cursor, get_pagination_metadata
from datetime import datetime

def test_encode_decode_cursor():
    timestamp = datetime(2025, 12, 20, 10, 0, 0)
    cursor = encode_cursor(timestamp)
    assert isinstance(cursor, str)
    
    decoded = decode_cursor(cursor)
    assert decoded == timestamp

def test_decode_invalid_cursor():
    assert decode_cursor("invalid_base64") is None
    assert decode_cursor(None) is None

class MockItem:
    def __init__(self, id, created_at):
        self.id = id
        self.created_at = created_at

def test_pagination_metadata():
    items = [
        MockItem(1, datetime(2025, 1, 1)), 
        MockItem(2, datetime(2025, 1, 2)),
        MockItem(3, datetime(2025, 1, 3))
    ]
    limit = 2
    
    # If len(items) > limit, there is more
    metadata = get_pagination_metadata(items, limit, "created_at")
    assert metadata["has_next"] is True
    assert metadata["next_cursor"] is not None
    assert metadata["count"] == 2
    
    # If len(items) <= limit, there is no more
    metadata = get_pagination_metadata(items[:2], limit, "created_at")
    assert metadata["has_next"] is False
    assert metadata["next_cursor"] is None
