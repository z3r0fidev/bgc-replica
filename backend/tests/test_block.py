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
        "email": f"block-test-{uuid.uuid4()}@example.com",
        "name": "Block Test User",
        "hashed_password": "x",
        "is_active": True,
    }
    fields.update(overrides)
    user = User(**fields)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


class TestBlockUser:
    @pytest.mark.asyncio
    async def test_blocks_user(self, client: AsyncClient, db_session: AsyncSession):
        blocker = await _make_user(db_session)
        target = await _make_user(db_session)

        response = await client.post(
            f"/api/block/{target.id}", headers=_headers_for(blocker.id)
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_cannot_block_self(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            f"/api/block/{user.id}", headers=_headers_for(user.id)
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_404_for_missing_target_user(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        blocker = await _make_user(db_session)

        response = await client.post(
            f"/api/block/{uuid.uuid4()}", headers=_headers_for(blocker.id)
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_blocking_twice_is_idempotent(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        blocker = await _make_user(db_session)
        target = await _make_user(db_session)

        first = await client.post(
            f"/api/block/{target.id}", headers=_headers_for(blocker.id)
        )
        second = await client.post(
            f"/api/block/{target.id}", headers=_headers_for(blocker.id)
        )

        assert first.status_code == 200
        assert second.status_code == 200


class TestUnblockUser:
    @pytest.mark.asyncio
    async def test_unblocks_previously_blocked_user(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        blocker = await _make_user(db_session)
        target = await _make_user(db_session)
        await client.post(f"/api/block/{target.id}", headers=_headers_for(blocker.id))

        response = await client.delete(
            f"/api/block/{target.id}", headers=_headers_for(blocker.id)
        )

        assert response.status_code == 200
        assert response.json()["success"] is True

    @pytest.mark.asyncio
    async def test_404_when_no_block_exists(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        blocker = await _make_user(db_session)
        target = await _make_user(db_session)

        response = await client.delete(
            f"/api/block/{target.id}", headers=_headers_for(blocker.id)
        )

        assert response.status_code == 404


class TestGetBlockedUsers:
    @pytest.mark.asyncio
    async def test_lists_only_users_i_blocked(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        blocker = await _make_user(db_session)
        blocked = await _make_user(db_session)
        not_blocked = await _make_user(db_session)
        await client.post(f"/api/block/{blocked.id}", headers=_headers_for(blocker.id))

        response = await client.get("/api/block/list", headers=_headers_for(blocker.id))

        assert response.status_code == 200
        ids = {entry["user"]["id"] for entry in response.json()}
        assert str(blocked.id) in ids
        assert str(not_blocked.id) not in ids

    @pytest.mark.asyncio
    async def test_empty_list_when_nothing_blocked(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.get("/api/block/list", headers=_headers_for(user.id))

        assert response.status_code == 200
        assert response.json() == []


class TestGetBlockStatus:
    @pytest.mark.asyncio
    async def test_not_blocked_by_default(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        other = await _make_user(db_session)

        response = await client.get(
            f"/api/block/status/{other.id}", headers=_headers_for(user.id)
        )

        assert response.status_code == 200
        data = response.json()
        assert data == {
            "is_blocked": False,
            "blocked_by_me": False,
            "blocked_by_them": False,
        }

    @pytest.mark.asyncio
    async def test_reflects_block_by_me(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        other = await _make_user(db_session)
        await client.post(f"/api/block/{other.id}", headers=_headers_for(user.id))

        response = await client.get(
            f"/api/block/status/{other.id}", headers=_headers_for(user.id)
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_blocked"] is True
        assert data["blocked_by_me"] is True
        assert data["blocked_by_them"] is False

    @pytest.mark.asyncio
    async def test_reflects_block_by_them(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        other = await _make_user(db_session)
        # other blocks user; user then checks status from their own perspective.
        await client.post(f"/api/block/{user.id}", headers=_headers_for(other.id))

        response = await client.get(
            f"/api/block/status/{other.id}", headers=_headers_for(user.id)
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_blocked"] is True
        assert data["blocked_by_me"] is False
        assert data["blocked_by_them"] is True


class TestUnauthenticated:
    @pytest.mark.asyncio
    async def test_block_requires_auth(self, client: AsyncClient):
        response = await client.post(f"/api/block/{uuid.uuid4()}")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, client: AsyncClient):
        response = await client.get("/api/block/list")
        assert response.status_code == 401
