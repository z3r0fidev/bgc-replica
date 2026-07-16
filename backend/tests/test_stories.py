import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import Story, User


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
        "email": f"story-test-{uuid.uuid4()}@example.com",
        "name": "Story Test User",
        "hashed_password": "x",
        "is_active": True,
    }
    fields.update(overrides)
    user = User(**fields)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _make_story(db: AsyncSession, author: User, **overrides) -> Story:
    fields = {
        "id": uuid.uuid4(),
        "user_id": author.id,
        "title": f"Story-{uuid.uuid4()}",
        "content": "Once upon a time.",
    }
    fields.update(overrides)
    story = Story(**fields)
    db.add(story)
    await db.commit()
    await db.refresh(story)
    return story


class TestGetStories:
    @pytest.mark.asyncio
    async def test_returns_paginated_stories(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        author = await _make_user(db_session)
        story = await _make_story(db_session, author)

        response = await client.get("/api/stories/")

        assert response.status_code == 200
        data = response.json()
        ids = {item["id"] for item in data["items"]}
        assert str(story.id) in ids
        assert "metadata" in data

    @pytest.mark.asyncio
    async def test_does_not_require_auth(self, client: AsyncClient):
        response = await client.get("/api/stories/")
        assert response.status_code == 200


class TestCreateStory:
    @pytest.mark.asyncio
    async def test_creates_story_for_current_user(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            "/api/stories/",
            json={"title": "My Story", "content": "It begins."},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "My Story"
        assert data["user_id"] == str(user.id)

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient):
        response = await client.post(
            "/api/stories/", json={"title": "Nope", "content": "x"}
        )
        assert response.status_code == 401


class TestGetStory:
    @pytest.mark.asyncio
    async def test_returns_story_by_id(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        author = await _make_user(db_session)
        story = await _make_story(db_session, author)

        response = await client.get(f"/api/stories/{story.id}")

        assert response.status_code == 200
        assert response.json()["id"] == str(story.id)

    @pytest.mark.asyncio
    async def test_404_for_missing_story(self, client: AsyncClient):
        response = await client.get(f"/api/stories/{uuid.uuid4()}")
        assert response.status_code == 404


class TestUpdateStory:
    @pytest.mark.asyncio
    async def test_owner_can_update(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        author = await _make_user(db_session)
        story = await _make_story(db_session, author)

        response = await client.put(
            f"/api/stories/{story.id}",
            json={"title": "Updated Title"},
            headers=_headers_for(author.id),
        )

        assert response.status_code == 200
        assert response.json()["title"] == "Updated Title"

    @pytest.mark.asyncio
    async def test_non_owner_gets_403(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        author = await _make_user(db_session)
        outsider = await _make_user(db_session)
        story = await _make_story(db_session, author)

        response = await client.put(
            f"/api/stories/{story.id}",
            json={"title": "Hijacked"},
            headers=_headers_for(outsider.id),
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_404_for_missing_story(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.put(
            f"/api/stories/{uuid.uuid4()}",
            json={"title": "X"},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 404


class TestDeleteStory:
    @pytest.mark.asyncio
    async def test_owner_can_delete(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        author = await _make_user(db_session)
        story = await _make_story(db_session, author)

        response = await client.delete(
            f"/api/stories/{story.id}", headers=_headers_for(author.id)
        )

        assert response.status_code == 204

        follow_up = await client.get(f"/api/stories/{story.id}")
        assert follow_up.status_code == 404

    @pytest.mark.asyncio
    async def test_non_owner_gets_403(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        author = await _make_user(db_session)
        outsider = await _make_user(db_session)
        story = await _make_story(db_session, author)

        response = await client.delete(
            f"/api/stories/{story.id}", headers=_headers_for(outsider.id)
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_404_for_missing_story(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.delete(
            f"/api/stories/{uuid.uuid4()}", headers=_headers_for(user.id)
        )

        assert response.status_code == 404
