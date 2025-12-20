import base64
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

def encode_cursor(dt: datetime) -> str:
    """Encodes a datetime into a base64 string."""
    return base64.b64encode(dt.isoformat().encode()).decode()

def decode_cursor(cursor: Optional[str]) -> Optional[datetime]:
    """Decodes a base64 string into a datetime."""
    if not cursor:
        return None
    try:
        decoded = base64.b64decode(cursor).decode()
        return datetime.fromisoformat(decoded)
    except (TypeError, ValueError, base64.binascii.Error):
        return None

def get_pagination_metadata(
    items: List[Any], 
    limit: int, 
    cursor_attribute: str = "created_at"
) -> Dict[str, Any]:
    """
    Generates pagination metadata based on the current page of items.
    Assumes items were fetched with limit+1 to detect has_next.
    """
    has_next = len(items) > limit
    next_cursor = None
    
    if has_next:
        # Get the cursor of the LAST item in the requested limit (not the limit+1 item)
        last_item = items[limit - 1]
        dt = getattr(last_item, cursor_attribute)
        if isinstance(dt, datetime):
            next_cursor = encode_cursor(dt)
            
    return {
        "has_next": has_next,
        "next_cursor": next_cursor,
        "count": min(len(items), limit)
    }

async def paginate_query(
    session: AsyncSession,
    query: select,
    model: Any,
    limit: int = 20,
    cursor: Optional[str] = None,
    cursor_attribute: str = "created_at"
) -> Dict[str, Any]:
    """
    Applies cursor-based pagination to a query.
    Assumes descending order by cursor_attribute.
    """
    dt_cursor = decode_cursor(cursor)
    
    # Clone and modify query
    stmt = query.order_by(desc(getattr(model, cursor_attribute)))
    
    if dt_cursor:
        stmt = stmt.where(getattr(model, cursor_attribute) < dt_cursor)
        
    # Fetch limit + 1 to check for next page
    stmt = stmt.limit(limit + 1)
    
    result = await session.execute(stmt)
    items = result.scalars().all()
    
    metadata = get_pagination_metadata(items, limit, cursor_attribute)
    
    return {
        "items": items[:limit],
        "metadata": metadata
    }
