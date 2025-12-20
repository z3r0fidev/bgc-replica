import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_rate_profile(client: AsyncClient, token: str):
    target_id = str(uuid.uuid4())
    payload = {"score": 9}
    response = await client.post(
        f"/api/profiles/{target_id}/rate",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["average_rating"] == 9.0
