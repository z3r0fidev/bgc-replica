import pytest
from httpx import AsyncClient
from app.models.user import User


@pytest.mark.asyncio
async def test_add_favorite(client: AsyncClient, token: str, test_target_user: User):
    target_id = str(test_target_user.id)
    response = await client.post(
        f"/api/social/favorite/{target_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["type"] == "FAVORITE"


@pytest.mark.asyncio
async def test_friend_request(client: AsyncClient, token: str, test_target_user: User):
    target_id = str(test_target_user.id)
    response = await client.post(
        f"/api/social/friend-request/{target_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "PENDING"
