import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


def _register_payload(**overrides) -> dict:
    payload = {
        "email": f"user-{uuid.uuid4()}@example.com",
        "username": f"user{uuid.uuid4().hex[:12]}",
        "name": "New User",
        "password": "StrongPass123!",
    }
    payload.update(overrides)
    return payload


class TestRegistrationUsername:
    @pytest.mark.asyncio
    async def test_register_requires_username(self, client: AsyncClient):
        payload = _register_payload()
        del payload["username"]

        response = await client.post("/api/auth/register", json=payload)

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_persists_and_lowercases_username(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        payload = _register_payload(username=f"MixedCase{uuid.uuid4().hex[:8]}")

        response = await client.post("/api/auth/register", json=payload)

        assert response.status_code == 200
        body = response.json()
        assert body["username"] == payload["username"].lower()

        result = await db_session.execute(
            select(User).where(User.email == payload["email"])
        )
        user = result.scalars().first()
        assert user.username == payload["username"].lower()

    @pytest.mark.asyncio
    async def test_register_rejects_duplicate_username_case_insensitively(
        self, client: AsyncClient
    ):
        username = f"dupe{uuid.uuid4().hex[:12]}"
        first = await client.post("/api/auth/register", json=_register_payload(username=username))
        assert first.status_code == 200

        second = await client.post(
            "/api/auth/register", json=_register_payload(username=username.upper())
        )

        assert second.status_code == 400
        assert "already taken" in second.json()["detail"].lower()

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "invalid_username",
        [
            "ab",  # too short
            "1abc",  # starts with a digit
            "has spaces",
            "has-dash",
            "a" * 31,  # too long
            "",
        ],
    )
    async def test_register_rejects_invalid_username_format(
        self, client: AsyncClient, invalid_username: str
    ):
        response = await client.post(
            "/api/auth/register", json=_register_payload(username=invalid_username)
        )

        assert response.status_code == 422


class TestUpdateUsername:
    @pytest.mark.asyncio
    async def test_update_username_success(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
    ):
        new_username = f"changed{uuid.uuid4().hex[:12]}"

        response = await client.patch(
            "/api/auth/username", json={"username": new_username}, headers=auth_headers
        )

        assert response.status_code == 200
        assert response.json()["username"] == new_username

        result = await db_session.execute(select(User).where(User.id == test_user.id))
        assert result.scalars().first().username == new_username

    @pytest.mark.asyncio
    async def test_update_username_rejects_taken_username(
        self, client: AsyncClient, auth_headers: dict
    ):
        register_payload = _register_payload()
        register_resp = await client.post("/api/auth/register", json=register_payload)
        assert register_resp.status_code == 200

        response = await client.patch(
            "/api/auth/username",
            json={"username": register_payload["username"]},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "already taken" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_update_username_allows_keeping_own_username(
        self, client: AsyncClient, auth_headers: dict
    ):
        same_username = f"stable{uuid.uuid4().hex[:12]}"
        first = await client.patch(
            "/api/auth/username", json={"username": same_username}, headers=auth_headers
        )
        assert first.status_code == 200

        second = await client.patch(
            "/api/auth/username", json={"username": same_username}, headers=auth_headers
        )
        assert second.status_code == 200

    @pytest.mark.asyncio
    async def test_update_username_rejects_invalid_format(
        self, client: AsyncClient, auth_headers: dict
    ):
        response = await client.patch(
            "/api/auth/username", json={"username": "9invalid"}, headers=auth_headers
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_username_requires_auth(self, client: AsyncClient):
        response = await client.patch(
            "/api/auth/username", json={"username": f"noauth{uuid.uuid4().hex[:8]}"}
        )

        assert response.status_code == 401
