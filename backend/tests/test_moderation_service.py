import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.community import ForumCategory, ForumPost, ForumThread, StatusUpdate
from app.models.user import User
from app.services.moderation_service import moderation_service


async def _make_user(db: AsyncSession, **overrides) -> User:
    fields = {
        "id": uuid.uuid4(),
        "email": f"moderation-test-{uuid.uuid4()}@example.com",
        "name": "Moderation Test User",
        "hashed_password": "x",
        "is_active": True,
    }
    fields.update(overrides)
    user = User(**fields)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _make_thread(db: AsyncSession, author: User) -> ForumThread:
    category = ForumCategory(
        id=uuid.uuid4(), name=f"cat-{uuid.uuid4()}", slug=f"cat-{uuid.uuid4()}"
    )
    db.add(category)
    await db.flush()
    thread = ForumThread(
        id=uuid.uuid4(),
        category_id=category.id,
        author_id=author.id,
        title="A thread",
        content="Thread content",
    )
    db.add(thread)
    await db.commit()
    await db.refresh(thread)
    return thread


async def _make_post(db: AsyncSession, author: User, thread: ForumThread) -> ForumPost:
    post = ForumPost(
        id=uuid.uuid4(), thread_id=thread.id, author_id=author.id, content="A post"
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


async def _make_status(db: AsyncSession, author: User) -> StatusUpdate:
    status_update = StatusUpdate(
        id=uuid.uuid4(), author_id=author.id, content="A status update"
    )
    db.add(status_update)
    await db.commit()
    await db.refresh(status_update)
    return status_update


class TestReportContent:
    @pytest.mark.asyncio
    async def test_creates_report_row(self, db_session: AsyncSession):
        reporter = await _make_user(db_session)
        author = await _make_user(db_session)
        thread = await _make_thread(db_session, author)

        report = await moderation_service.report_content(
            db_session,
            reporter_id=reporter.id,
            content_type="THREAD",
            content_id=thread.id,
            reason="Spam",
        )

        assert report.id is not None
        assert report.reporter_id == reporter.id
        assert report.content_type == "THREAD"
        assert report.content_id == thread.id
        assert report.reason == "Spam"

    @pytest.mark.asyncio
    async def test_increments_thread_report_count(self, db_session: AsyncSession):
        reporter = await _make_user(db_session)
        author = await _make_user(db_session)
        thread = await _make_thread(db_session, author)

        await moderation_service.report_content(
            db_session,
            reporter_id=reporter.id,
            content_type="THREAD",
            content_id=thread.id,
            reason="Spam",
        )

        await db_session.refresh(thread)
        assert thread.report_count == 1

    @pytest.mark.asyncio
    async def test_increments_post_report_count(self, db_session: AsyncSession):
        reporter = await _make_user(db_session)
        author = await _make_user(db_session)
        thread = await _make_thread(db_session, author)
        post = await _make_post(db_session, author, thread)

        await moderation_service.report_content(
            db_session,
            reporter_id=reporter.id,
            content_type="POST",
            content_id=post.id,
            reason="Harassment",
        )

        await db_session.refresh(post)
        assert post.report_count == 1

    @pytest.mark.asyncio
    async def test_increments_status_report_count(self, db_session: AsyncSession):
        reporter = await _make_user(db_session)
        author = await _make_user(db_session)
        status_update = await _make_status(db_session, author)

        await moderation_service.report_content(
            db_session,
            reporter_id=reporter.id,
            content_type="STATUS",
            content_id=status_update.id,
            reason="Inappropriate",
        )

        await db_session.refresh(status_update)
        assert status_update.report_count == 1

    @pytest.mark.asyncio
    async def test_multiple_reports_accumulate_count(self, db_session: AsyncSession):
        author = await _make_user(db_session)
        thread = await _make_thread(db_session, author)

        for _ in range(3):
            reporter = await _make_user(db_session)
            await moderation_service.report_content(
                db_session,
                reporter_id=reporter.id,
                content_type="THREAD",
                content_id=thread.id,
                reason="Spam",
            )

        await db_session.refresh(thread)
        assert thread.report_count == 3

    @pytest.mark.asyncio
    async def test_reaching_threshold_does_not_raise(self, db_session: AsyncSession):
        author = await _make_user(db_session)
        thread = await _make_thread(db_session, author)

        for _ in range(moderation_service.REPORT_THRESHOLD):
            reporter = await _make_user(db_session)
            await moderation_service.report_content(
                db_session,
                reporter_id=reporter.id,
                content_type="THREAD",
                content_id=thread.id,
                reason="Spam",
            )

        await db_session.refresh(thread)
        assert thread.report_count == moderation_service.REPORT_THRESHOLD

    @pytest.mark.asyncio
    async def test_user_content_type_creates_report_without_count_lookup(
        self, db_session: AsyncSession
    ):
        # "USER" isn't in the THREAD/POST/STATUS model_map, so no
        # report_count increment is attempted - just the report row itself.
        reporter = await _make_user(db_session)
        target = await _make_user(db_session)

        report = await moderation_service.report_content(
            db_session,
            reporter_id=reporter.id,
            content_type="USER",
            content_id=target.id,
            reason="Harassment",
        )

        assert report.content_type == "USER"
        assert report.content_id == target.id

    @pytest.mark.asyncio
    async def test_nonexistent_target_does_not_raise(self, db_session: AsyncSession):
        reporter = await _make_user(db_session)

        report = await moderation_service.report_content(
            db_session,
            reporter_id=reporter.id,
            content_type="THREAD",
            content_id=uuid.uuid4(),
            reason="Spam",
        )

        assert report.id is not None


class TestReportContentApi:
    @pytest.mark.asyncio
    async def test_report_thread_via_api(
        self, client: AsyncClient, token: str, db_session: AsyncSession
    ):
        author = await _make_user(db_session)
        thread = await _make_thread(db_session, author)

        response = await client.post(
            "/api/moderation/report",
            json={
                "content_type": "THREAD",
                "content_id": str(thread.id),
                "reason": "This is spam",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content_type"] == "THREAD"
        assert data["content_id"] == str(thread.id)
        await db_session.refresh(thread)
        assert thread.report_count == 1


class TestReportUserApi:
    @pytest.mark.asyncio
    async def test_report_user_success(
        self, client: AsyncClient, token: str, db_session: AsyncSession
    ):
        target = await _make_user(db_session)

        response = await client.post(
            "/api/moderation/report-user",
            json={
                "user_id": str(target.id),
                "reason": "HARASSMENT",
                "details": "Sent threatening messages",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content_type"] == "USER"
        assert data["content_id"] == str(target.id)
        assert data["reason"] == "HARASSMENT: Sent threatening messages"

    @pytest.mark.asyncio
    async def test_cannot_report_self(
        self, client: AsyncClient, token: str, test_user: User
    ):
        response = await client.post(
            "/api/moderation/report-user",
            json={"user_id": str(test_user.id), "reason": "SPAM"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_404_for_missing_user(self, client: AsyncClient, token: str):
        response = await client.post(
            "/api/moderation/report-user",
            json={"user_id": str(uuid.uuid4()), "reason": "SPAM"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404
