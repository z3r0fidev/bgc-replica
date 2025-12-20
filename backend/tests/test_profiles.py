import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_get_my_profile(client: AsyncClient, token: str):
    response = await client.get("/api/profiles/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "bio" in data

@pytest.mark.asyncio
async def test_update_profile(client: AsyncClient, token: str):
    payload = {"bio": "New bio", "height": "6'0\""}
    response = await client.put(
        "/api/profiles/me",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["bio"] == "New bio"
    assert data["height"] == "6'0\""
