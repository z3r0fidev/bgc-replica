import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_add_favorite(client: AsyncClient, token: str):
    target_id = str(uuid.uuid4())
    response = await client.post(
        f"/api/social/favorite/{target_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["type"] == "FAVORITE"

@pytest.mark.asyncio
async def test_friend_request(client: AsyncClient, token: str):
    target_id = str(uuid.uuid4())
    response = await client.post(
        f"/api/social/friend-request/{target_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "PENDING"
