import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_get_categories(async_client: AsyncClient):
    response = await async_client.get("/api/personals/categories")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 15
    assert data[0]["name"] == "Reviewed"
    assert "slug" in data[0]
    assert "icon" in data[0]
    assert "banner" in data[0]

@pytest.mark.asyncio
async def test_get_listings(async_client: AsyncClient, auth_headers: dict):
    response = await async_client.get("/api/personals/listings", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "metadata" in data
