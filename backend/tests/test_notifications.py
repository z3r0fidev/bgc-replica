import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User


def _token_for(user_id: uuid.UUID) -> str:
    secret = settings.NEXTAUTH_SECRET or settings.SECRET_KEY
    expire = datetime.now(timezone.utc) + timedelta(minutes=30)
    return jwt.encode(
        {"exp": expire, "sub": str(user_id)}, secret, algorithm=settings.ALGORITHM
    )


def _headers_for(user_id: uuid.UUID) -> dict:
    return {"Authorization": f"Bearer {_token_for(user_id)}"}


async def _make_user(db: AsyncSession, **overrides) -> User:
    fields = {
        "id": uuid.uuid4(),
        "email": f"notif-test-{uuid.uuid4()}@example.com",
        "name": "Notification Test User",
        "hashed_password": "x",
        "is_active": True,
    }
    fields.update(overrides)
    user = User(**fields)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


class TestGetPreferences:
    @pytest.mark.asyncio
    async def test_returns_defaults_when_nothing_stored(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.get(
            "/api/notifications/preferences", headers=_headers_for(user.id)
        )

        assert response.status_code == 200
        prefs = response.json()["preferences"]
        assert prefs["email_messages"] is True
        assert prefs["email_digest_frequency"] == "instant"

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient):
        response = await client.get("/api/notifications/preferences")
        assert response.status_code == 401


class TestUpdatePreferences:
    @pytest.mark.asyncio
    async def test_partial_update_persists(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.put(
            "/api/notifications/preferences",
            json={"email_messages": False, "email_digest_frequency": "weekly"},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 200
        prefs = response.json()["preferences"]
        assert prefs["email_messages"] is False
        assert prefs["email_digest_frequency"] == "weekly"
        # Untouched fields keep their defaults.
        assert prefs["email_friend_requests"] is True

        follow_up = await client.get(
            "/api/notifications/preferences", headers=_headers_for(user.id)
        )
        assert follow_up.json()["preferences"]["email_messages"] is False

    @pytest.mark.asyncio
    async def test_invalid_digest_frequency_falls_back_to_instant(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.put(
            "/api/notifications/preferences",
            json={"email_digest_frequency": "hourly"},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 200
        assert response.json()["preferences"]["email_digest_frequency"] == "instant"

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient):
        response = await client.put(
            "/api/notifications/preferences", json={"email_messages": False}
        )
        assert response.status_code == 401


class TestResetPreferences:
    @pytest.mark.asyncio
    async def test_resets_to_defaults_after_modification(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        await client.put(
            "/api/notifications/preferences",
            json={"email_messages": False, "email_digest_frequency": "never"},
            headers=_headers_for(user.id),
        )

        response = await client.post(
            "/api/notifications/preferences/reset", headers=_headers_for(user.id)
        )

        assert response.status_code == 200
        prefs = response.json()["preferences"]
        assert prefs["email_messages"] is True
        assert prefs["email_digest_frequency"] == "instant"


class TestToggleAllEmail:
    @pytest.mark.asyncio
    async def test_disables_all_email_and_sets_digest_never(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.put(
            "/api/notifications/preferences/email-all",
            params={"enabled": "false"},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["preferences"]["email_messages"] is False
        assert data["preferences"]["email_mentions"] is False
        assert data["preferences"]["email_digest_frequency"] == "never"

    @pytest.mark.asyncio
    async def test_enables_all_email(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        await client.put(
            "/api/notifications/preferences/email-all",
            params={"enabled": "false"},
            headers=_headers_for(user.id),
        )

        response = await client.put(
            "/api/notifications/preferences/email-all",
            params={"enabled": "true"},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["preferences"]["email_messages"] is True
        assert data["preferences"]["email_forum_replies"] is True

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient):
        response = await client.put(
            "/api/notifications/preferences/email-all", params={"enabled": "true"}
        )
        assert response.status_code == 401
