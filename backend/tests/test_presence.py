import pytest
import asyncio
import time
import uuid
from app.services.presence import presence_service

@pytest.mark.asyncio
async def test_update_presence():
    user_id = uuid.uuid4()
    await presence_service.update_presence(user_id, "online")
    
    is_online = await presence_service.is_user_online(user_id)
    assert is_online is True

@pytest.mark.asyncio
async def test_get_online_users():
    user_1 = uuid.uuid4()
    user_2 = uuid.uuid4()
    await presence_service.update_presence(user_1, "online")
    await presence_service.update_presence(user_2, "online")
    
    online_users = await presence_service.get_online_users()
    assert str(user_1) in online_users
    assert str(user_2) in online_users
