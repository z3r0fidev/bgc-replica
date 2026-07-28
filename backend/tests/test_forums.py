import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.community import ForumCategory, ForumPost, ForumThread
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
        "email": f"forum-test-{uuid.uuid4()}@example.com",
        "name": "Forum Test User",
        "hashed_password": "x",
        "is_active": True,
    }
    fields.update(overrides)
    user = User(**fields)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _make_category(db: AsyncSession, **overrides) -> ForumCategory:
    marker = uuid.uuid4().hex[:8]
    fields = {
        "id": uuid.uuid4(),
        "name": f"Category-{marker}",
        "slug": f"category-{marker}",
    }
    fields.update(overrides)
    category = ForumCategory(**fields)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def _make_thread(
    db: AsyncSession, category: ForumCategory, author: User, **overrides
) -> ForumThread:
    fields = {
        "id": uuid.uuid4(),
        "category_id": category.id,
        "author_id": author.id,
        "title": "A thread",
        "content": "Thread content",
    }
    fields.update(overrides)
    thread = ForumThread(**fields)
    db.add(thread)
    await db.commit()
    await db.refresh(thread)
    return thread


class TestGetForumTree:
    @pytest.mark.asyncio
    async def test_nests_children_under_parent(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        parent = await _make_category(db_session)
        child = await _make_category(db_session, parent_id=parent.id)

        response = await client.get("/api/forums/tree")

        assert response.status_code == 200
        tree = response.json()
        parent_node = next(c for c in tree if c["id"] == str(parent.id))
        assert [c["id"] for c in parent_node["children"]] == [str(child.id)]
        # The child must not also appear as a top-level root.
        assert not any(c["id"] == str(child.id) for c in tree)

    @pytest.mark.asyncio
    async def test_does_not_require_auth(self, client: AsyncClient):
        response = await client.get("/api/forums/tree")
        assert response.status_code == 200


class TestGetCategories:
    @pytest.mark.asyncio
    async def test_returns_flat_list(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        category = await _make_category(db_session)

        response = await client.get("/api/forums/categories")

        assert response.status_code == 200
        ids = {c["id"] for c in response.json()}
        assert str(category.id) in ids


class TestGetCategoryThreads:
    @pytest.mark.asyncio
    async def test_returns_paginated_threads_for_category(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        author = await _make_user(db_session)
        category = await _make_category(db_session)
        other_category = await _make_category(db_session)
        thread = await _make_thread(db_session, category, author)
        await _make_thread(db_session, other_category, author)

        response = await client.get(f"/api/forums/categories/{category.slug}/threads")

        assert response.status_code == 200
        data = response.json()
        ids = {item["id"] for item in data["items"]}
        assert ids == {str(thread.id)}

    @pytest.mark.asyncio
    async def test_404_for_missing_category(self, client: AsyncClient):
        response = await client.get("/api/forums/categories/does-not-exist/threads")
        assert response.status_code == 404


class TestCreateThread:
    @pytest.mark.asyncio
    async def test_creates_thread_owned_by_current_user(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        category = await _make_category(db_session)

        response = await client.post(
            "/api/forums/threads",
            json={
                "category_id": str(category.id),
                "title": "My thread",
                "content": "Hello forum",
            },
            headers=_headers_for(user.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "My thread"
        assert data["category_id"] == str(category.id)

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient, db_session: AsyncSession):
        category = await _make_category(db_session)

        response = await client.post(
            "/api/forums/threads",
            json={
                "category_id": str(category.id),
                "title": "Nope",
                "content": "x",
            },
        )

        assert response.status_code == 401


class TestGetThreadPosts:
    @pytest.mark.asyncio
    async def test_returns_posts_ordered_by_created_at(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        author = await _make_user(db_session)
        category = await _make_category(db_session)
        thread = await _make_thread(db_session, category, author)
        first = ForumPost(
            thread_id=thread.id,
            author_id=author.id,
            content="first",
            created_at=datetime(2026, 1, 1),
        )
        second = ForumPost(
            thread_id=thread.id,
            author_id=author.id,
            content="second",
            created_at=datetime(2026, 1, 2),
        )
        db_session.add_all([second, first])
        await db_session.commit()

        response = await client.get(f"/api/forums/threads/{thread.id}/posts")

        assert response.status_code == 200
        contents = [p["content"] for p in response.json()]
        assert contents == ["first", "second"]


class TestCreatePost:
    @pytest.mark.asyncio
    async def test_creates_post_and_bumps_thread_last_activity(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        author = await _make_user(db_session)
        category = await _make_category(db_session)
        thread = await _make_thread(
            db_session, category, author, last_activity=datetime(2020, 1, 1)
        )

        response = await client.post(
            "/api/forums/posts",
            json={"thread_id": str(thread.id), "content": "A reply"},
            headers=_headers_for(author.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "A reply"
        assert data["thread_id"] == str(thread.id)

        await db_session.refresh(thread)
        assert thread.last_activity > datetime(2020, 1, 1)

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient, db_session: AsyncSession):
        author = await _make_user(db_session)
        category = await _make_category(db_session)
        thread = await _make_thread(db_session, category, author)

        response = await client.post(
            "/api/forums/posts",
            json={"thread_id": str(thread.id), "content": "Sneaky"},
        )

        assert response.status_code == 401


class TestCreatePostMentions:
    @pytest.mark.asyncio
    async def test_mentioning_a_user_queues_an_email(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        author = await _make_user(db_session, username="theauthor")
        mentioned = await _make_user(db_session, username="mentioned_one")
        category = await _make_category(db_session)
        thread = await _make_thread(db_session, category, author, title="A great thread")

        with patch("app.api.forums.send_mention_email_task") as mock_task:
            response = await client.post(
                "/api/forums/posts",
                json={"thread_id": str(thread.id), "content": "hey @mentioned_one check this"},
                headers=_headers_for(author.id),
            )

        assert response.status_code == 200
        mock_task.delay.assert_called_once_with(
            to_email=mentioned.email,
            mentioner_name=author.name or "Someone",
            thread_title="A great thread",
            content_preview="hey @mentioned_one check this",
            thread_id=str(thread.id),
            to_user_name=mentioned.name,
        )

    @pytest.mark.asyncio
    async def test_mentioning_yourself_does_not_email_yourself(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        author = await _make_user(db_session, username="selfmentioner")
        category = await _make_category(db_session)
        thread = await _make_thread(db_session, category, author)

        with patch("app.api.forums.send_mention_email_task") as mock_task:
            response = await client.post(
                "/api/forums/posts",
                json={"thread_id": str(thread.id), "content": "note to @selfmentioner"},
                headers=_headers_for(author.id),
            )

        assert response.status_code == 200
        mock_task.delay.assert_not_called()

    @pytest.mark.asyncio
    async def test_mentioned_user_with_email_mentions_disabled_is_not_emailed(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        author = await _make_user(db_session, username="poster")
        await _make_user(
            db_session,
            username="quietuser",
            notification_preferences={"email_mentions": False},
        )
        category = await _make_category(db_session)
        thread = await _make_thread(db_session, category, author)

        with patch("app.api.forums.send_mention_email_task") as mock_task:
            response = await client.post(
                "/api/forums/posts",
                json={"thread_id": str(thread.id), "content": "hi @quietuser"},
                headers=_headers_for(author.id),
            )

        assert response.status_code == 200
        mock_task.delay.assert_not_called()

    @pytest.mark.asyncio
    async def test_mentioning_a_nonexistent_username_is_a_noop(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        author = await _make_user(db_session, username="lonelyposter")
        category = await _make_category(db_session)
        thread = await _make_thread(db_session, category, author)

        with patch("app.api.forums.send_mention_email_task") as mock_task:
            response = await client.post(
                "/api/forums/posts",
                json={"thread_id": str(thread.id), "content": "hi @nobodywiththisname"},
                headers=_headers_for(author.id),
            )

        assert response.status_code == 200
        mock_task.delay.assert_not_called()

    @pytest.mark.asyncio
    async def test_post_with_no_mentions_does_not_queue_email(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        author = await _make_user(db_session, username="plainposter")
        category = await _make_category(db_session)
        thread = await _make_thread(db_session, category, author)

        with patch("app.api.forums.send_mention_email_task") as mock_task:
            response = await client.post(
                "/api/forums/posts",
                json={"thread_id": str(thread.id), "content": "just a normal reply"},
                headers=_headers_for(author.id),
            )

        assert response.status_code == 200
        mock_task.delay.assert_not_called()
