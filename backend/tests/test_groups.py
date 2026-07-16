import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.community import CommunityGroup, GroupMembership
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
        "email": f"group-test-{uuid.uuid4()}@example.com",
        "name": "Group Test User",
        "hashed_password": "x",
        "is_active": True,
    }
    fields.update(overrides)
    user = User(**fields)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _make_group(db: AsyncSession, owner: User, **overrides) -> CommunityGroup:
    fields = {
        "id": uuid.uuid4(),
        "name": f"Group-{uuid.uuid4()}",
        "owner_id": owner.id,
    }
    fields.update(overrides)
    group = CommunityGroup(**fields)
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return group


class TestListGroups:
    @pytest.mark.asyncio
    async def test_lists_all_groups(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner, name=f"Anglers-{uuid.uuid4()}")

        response = await client.get("/api/groups/")

        assert response.status_code == 200
        ids = {g["id"] for g in response.json()}
        assert str(group.id) in ids

    @pytest.mark.asyncio
    async def test_filters_by_query(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        marker = uuid.uuid4().hex[:8]
        matching = await _make_group(db_session, owner, name=f"Chess-{marker}")
        other = await _make_group(
            db_session, owner, name=f"Poker-{uuid.uuid4().hex[:8]}"
        )

        response = await client.get("/api/groups/", params={"query": "Chess"})

        assert response.status_code == 200
        ids = {g["id"] for g in response.json()}
        assert str(matching.id) in ids
        assert str(other.id) not in ids

    @pytest.mark.asyncio
    async def test_does_not_require_auth(self, client: AsyncClient):
        response = await client.get("/api/groups/")
        assert response.status_code == 200


class TestCreateGroup:
    @pytest.mark.asyncio
    async def test_creates_group_and_adds_owner_as_member(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            "/api/groups/",
            json={"name": f"New Group {uuid.uuid4()}", "is_private": False},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["owner_id"] == str(user.id)

        from sqlalchemy import select

        result = await db_session.execute(
            select(GroupMembership).where(
                GroupMembership.group_id == uuid.UUID(data["id"]),
                GroupMembership.user_id == user.id,
            )
        )
        membership = result.scalars().first()
        assert membership is not None
        assert membership.role == "OWNER"

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient):
        response = await client.post(
            "/api/groups/", json={"name": f"Nope {uuid.uuid4()}"}
        )
        assert response.status_code == 401


class TestJoinGroup:
    @pytest.mark.asyncio
    async def test_new_member_joins(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        joiner = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.post(
            f"/api/groups/{group.id}/join", headers=_headers_for(joiner.id)
        )

        assert response.status_code == 200
        assert response.json() == {"status": "joined"}

    @pytest.mark.asyncio
    async def test_already_member_is_a_noop(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        db_session.add(
            GroupMembership(user_id=owner.id, group_id=group.id, role="OWNER")
        )
        await db_session.commit()

        response = await client.post(
            f"/api/groups/{group.id}/join", headers=_headers_for(owner.id)
        )

        assert response.status_code == 200
        assert response.json() == {"status": "already_member"}

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient):
        response = await client.post(f"/api/groups/{uuid.uuid4()}/join")
        assert response.status_code == 401


class TestGetGroupFeed:
    @pytest.mark.asyncio
    async def test_returns_empty_list(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        # get_group_feed is currently a stub that always returns [] (see
        # app/api/groups.py docstring) - this test documents that actual
        # current behavior rather than the eventually-intended one.
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.get(f"/api/groups/{group.id}/feed")

        assert response.status_code == 200
        assert response.json() == []
