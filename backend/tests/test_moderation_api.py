import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.community import (
    ContentReport,
    ForumCategory,
    ForumPost,
    ForumThread,
    StatusUpdate,
)
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
        "email": f"moderation-api-test-{uuid.uuid4()}@example.com",
        "name": "Moderation API Test User",
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
        "title": "A reported thread",
        "content": "Thread content",
    }
    fields.update(overrides)
    thread = ForumThread(**fields)
    db.add(thread)
    await db.commit()
    await db.refresh(thread)
    return thread


async def _make_post(
    db: AsyncSession, thread: ForumThread, author: User, **overrides
) -> ForumPost:
    fields = {
        "id": uuid.uuid4(),
        "thread_id": thread.id,
        "author_id": author.id,
        "content": "A reported post",
    }
    fields.update(overrides)
    post = ForumPost(**fields)
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


async def _make_status(db: AsyncSession, author: User, **overrides) -> StatusUpdate:
    fields = {
        "id": uuid.uuid4(),
        "author_id": author.id,
        "content": "A reported status update",
    }
    fields.update(overrides)
    status_update = StatusUpdate(**fields)
    db.add(status_update)
    await db.commit()
    await db.refresh(status_update)
    return status_update


async def _make_report(
    db: AsyncSession,
    reporter: User,
    content_type: str,
    content_id: uuid.UUID,
    **overrides,
) -> ContentReport:
    fields = {
        "id": uuid.uuid4(),
        "reporter_id": reporter.id,
        "content_type": content_type,
        "content_id": content_id,
        "reason": "SPAM",
        "status": "PENDING",
    }
    fields.update(overrides)
    report = ContentReport(**fields)
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


class TestReportContent:
    """POST /api/moderation/report"""

    @pytest.mark.asyncio
    async def test_creates_report_row(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        reporter = await _make_user(db_session)
        category = await _make_category(db_session)
        thread = await _make_thread(db_session, category, reporter)

        response = await client.post(
            "/api/moderation/report",
            json={
                "content_type": "THREAD",
                "content_id": str(thread.id),
                "reason": "Off-topic spam",
            },
            headers=_headers_for(reporter.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content_type"] == "THREAD"
        assert data["content_id"] == str(thread.id)
        assert data["reason"] == "Off-topic spam"
        assert data["status"] == "PENDING"

        row = (
            await db_session.execute(
                select(ContentReport).where(ContentReport.id == uuid.UUID(data["id"]))
            )
        ).scalar_one()
        assert row.reporter_id == reporter.id
        assert row.content_type == "THREAD"
        assert row.content_id == thread.id
        assert row.reason == "Off-topic spam"

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient, db_session: AsyncSession):
        response = await client.post(
            "/api/moderation/report",
            json={
                "content_type": "THREAD",
                "content_id": str(uuid.uuid4()),
                "reason": "Spam",
            },
        )
        assert response.status_code == 401


class TestReportUser:
    """POST /api/moderation/report-user"""

    @pytest.mark.asyncio
    async def test_creates_user_report(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        reporter = await _make_user(db_session)
        target = await _make_user(db_session)

        response = await client.post(
            "/api/moderation/report-user",
            json={"user_id": str(target.id), "reason": "HARASSMENT"},
            headers=_headers_for(reporter.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content_type"] == "USER"
        assert data["content_id"] == str(target.id)
        assert data["reason"] == "HARASSMENT"

    @pytest.mark.asyncio
    async def test_cannot_report_self(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        reporter = await _make_user(db_session)

        response = await client.post(
            "/api/moderation/report-user",
            json={"user_id": str(reporter.id), "reason": "SPAM"},
            headers=_headers_for(reporter.id),
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Cannot report yourself"

    @pytest.mark.asyncio
    async def test_404_for_nonexistent_target(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        reporter = await _make_user(db_session)

        response = await client.post(
            "/api/moderation/report-user",
            json={"user_id": str(uuid.uuid4()), "reason": "SPAM"},
            headers=_headers_for(reporter.id),
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_reason_includes_details_when_provided(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        reporter = await _make_user(db_session)
        target = await _make_user(db_session)

        response = await client.post(
            "/api/moderation/report-user",
            json={
                "user_id": str(target.id),
                "reason": "FAKE_PROFILE",
                "details": "Uses stolen photos",
            },
            headers=_headers_for(reporter.id),
        )

        assert response.status_code == 200
        report_id = uuid.UUID(response.json()["id"])
        row = (
            await db_session.execute(
                select(ContentReport).where(ContentReport.id == report_id)
            )
        ).scalar_one()
        assert row.reason == "FAKE_PROFILE: Uses stolen photos"

    @pytest.mark.asyncio
    async def test_reason_is_bare_when_details_omitted(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        reporter = await _make_user(db_session)
        target = await _make_user(db_session)

        response = await client.post(
            "/api/moderation/report-user",
            json={"user_id": str(target.id), "reason": "SPAM"},
            headers=_headers_for(reporter.id),
        )

        assert response.status_code == 200
        report_id = uuid.UUID(response.json()["id"])
        row = (
            await db_session.execute(
                select(ContentReport).where(ContentReport.id == report_id)
            )
        ).scalar_one()
        assert row.reason == "SPAM"

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient, db_session: AsyncSession):
        target = await _make_user(db_session)

        response = await client.post(
            "/api/moderation/report-user",
            json={"user_id": str(target.id), "reason": "SPAM"},
        )
        assert response.status_code == 401


class TestGetModerationQueue:
    """GET /api/moderation/queue"""

    @pytest.mark.asyncio
    async def test_defaults_to_pending_only(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        pending = await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), status="PENDING"
        )
        await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), status="RESOLVED"
        )

        response = await client.get(
            "/api/moderation/queue", headers=_headers_for(admin.id)
        )

        assert response.status_code == 200
        ids = {r["id"] for r in response.json()}
        assert ids == {str(pending.id)}

    @pytest.mark.asyncio
    async def test_status_filter(self, client: AsyncClient, db_session: AsyncSession):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), status="PENDING"
        )
        resolved = await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), status="RESOLVED"
        )

        response = await client.get(
            "/api/moderation/queue",
            params={"status_filter": "RESOLVED"},
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 200
        ids = {r["id"] for r in response.json()}
        assert ids == {str(resolved.id)}

    @pytest.mark.asyncio
    async def test_content_type_filter(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        target = await _make_user(db_session)
        user_report = await _make_report(db_session, reporter, "USER", target.id)
        await _make_report(db_session, reporter, "THREAD", uuid.uuid4())

        response = await client.get(
            "/api/moderation/queue",
            params={"content_type": "USER"},
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 200
        ids = {r["id"] for r in response.json()}
        assert ids == {str(user_report.id)}

    @pytest.mark.asyncio
    async def test_pagination_orders_newest_first(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        base = datetime(2026, 1, 1)
        oldest = await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), created_at=base
        )
        middle = await _make_report(
            db_session,
            reporter,
            "THREAD",
            uuid.uuid4(),
            created_at=base + timedelta(hours=1),
        )
        newest = await _make_report(
            db_session,
            reporter,
            "THREAD",
            uuid.uuid4(),
            created_at=base + timedelta(hours=2),
        )

        response = await client.get(
            "/api/moderation/queue",
            params={"limit": 2},
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert [r["id"] for r in data] == [str(newest.id), str(middle.id)]
        assert str(oldest.id) not in [r["id"] for r in data]

    @pytest.mark.asyncio
    async def test_offset_skips_newest(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        base = datetime(2026, 1, 1)
        oldest = await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), created_at=base
        )
        await _make_report(
            db_session,
            reporter,
            "THREAD",
            uuid.uuid4(),
            created_at=base + timedelta(hours=1),
        )

        response = await client.get(
            "/api/moderation/queue",
            params={"limit": 2, "offset": 1},
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert [r["id"] for r in data] == [str(oldest.id)]

    @pytest.mark.asyncio
    async def test_reporter_info_populated(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session, name="Reporter Name")
        report = await _make_report(db_session, reporter, "THREAD", uuid.uuid4())

        response = await client.get(
            "/api/moderation/queue", headers=_headers_for(admin.id)
        )

        assert response.status_code == 200
        entry = next(r for r in response.json() if r["id"] == str(report.id))
        assert entry["reporter"]["id"] == str(reporter.id)
        assert entry["reporter"]["name"] == "Reporter Name"
        assert entry["reporter"]["email"] == reporter.email

    @pytest.mark.asyncio
    async def test_reporter_fallback_when_reporter_user_deleted(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        report = await _make_report(db_session, reporter, "THREAD", uuid.uuid4())

        # content_reports.reporter_id has ON DELETE CASCADE, so a normal
        # DELETE of the user would remove this report too. Disable FK
        # trigger enforcement for this session only (this is a superuser
        # connection to the local test container, and it's undone below and
        # rolled back with the rest of the test transaction regardless) to
        # produce an orphaned report and exercise the ReporterInfo(id=...)
        # fallback branch in get_moderation_queue.
        await db_session.execute(text("SET session_replication_role = replica"))
        await db_session.execute(
            text("DELETE FROM users WHERE id = :id"), {"id": reporter.id}
        )
        await db_session.execute(text("SET session_replication_role = origin"))
        await db_session.commit()
        # db.get() checks the session identity map before hitting the DB -
        # the "reporter" object loaded earlier in this same session would
        # otherwise be returned even though its row is now gone.
        db_session.expunge(reporter)

        response = await client.get(
            "/api/moderation/queue", headers=_headers_for(admin.id)
        )

        assert response.status_code == 200
        entry = next(r for r in response.json() if r["id"] == str(report.id))
        assert entry["reporter"]["id"] == str(reporter.id)
        assert entry["reporter"]["name"] is None
        assert entry["reporter"]["email"] is None

    @pytest.mark.asyncio
    async def test_content_preview_for_thread(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        category = await _make_category(db_session)
        thread = await _make_thread(db_session, category, reporter, title="X" * 250)
        report = await _make_report(db_session, reporter, "THREAD", thread.id)

        response = await client.get(
            "/api/moderation/queue", headers=_headers_for(admin.id)
        )

        assert response.status_code == 200
        entry = next(r for r in response.json() if r["id"] == str(report.id))
        assert entry["content_preview"] == "X" * 200

    @pytest.mark.asyncio
    async def test_forbidden_for_non_admin(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        non_admin = await _make_user(db_session)

        response = await client.get(
            "/api/moderation/queue", headers=_headers_for(non_admin.id)
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient):
        response = await client.get("/api/moderation/queue")
        assert response.status_code == 401


class TestGetQueueCount:
    """GET /api/moderation/queue/count"""

    @pytest.mark.asyncio
    async def test_counts_pending_only(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), status="PENDING"
        )
        await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), status="PENDING"
        )
        await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), status="RESOLVED"
        )
        await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), status="DISMISSED"
        )

        response = await client.get(
            "/api/moderation/queue/count", headers=_headers_for(admin.id)
        )

        assert response.status_code == 200
        assert response.json()["pending_count"] == 2

    @pytest.mark.asyncio
    async def test_forbidden_for_non_admin(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        non_admin = await _make_user(db_session)

        response = await client.get(
            "/api/moderation/queue/count", headers=_headers_for(non_admin.id)
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient):
        response = await client.get("/api/moderation/queue/count")
        assert response.status_code == 401


class TestGetModerationStats:
    """GET /api/moderation/stats"""

    @pytest.mark.asyncio
    async def test_stats_correctness(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)

        await _make_report(
            db_session,
            reporter,
            "THREAD",
            uuid.uuid4(),
            reason="SPAM",
            status="PENDING",
        )
        await _make_report(
            db_session,
            reporter,
            "POST",
            uuid.uuid4(),
            reason="SPAM: excessive links",
            status="PENDING",
        )
        await _make_report(
            db_session,
            reporter,
            "THREAD",
            uuid.uuid4(),
            reason="HARASSMENT",
            status="PENDING",
        )
        # Non-pending reports must not affect pending_count / by-type / by-reason,
        # but must still count toward total_reports.
        await _make_report(
            db_session,
            reporter,
            "STATUS",
            uuid.uuid4(),
            reason="OTHER",
            status="RESOLVED",
        )
        await _make_report(
            db_session,
            reporter,
            "STATUS",
            uuid.uuid4(),
            reason="OTHER",
            status="DISMISSED",
        )

        response = await client.get(
            "/api/moderation/stats", headers=_headers_for(admin.id)
        )

        assert response.status_code == 200
        data = response.json()
        assert data["pending_count"] == 3
        assert data["total_reports"] == 5
        assert data["reports_by_type"] == {"THREAD": 2, "POST": 1}
        assert data["reports_by_reason"] == {"SPAM": 2, "HARASSMENT": 1}

    @pytest.mark.asyncio
    async def test_resolved_today_counts_by_resolved_at_not_created_at(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """
        Issue #132 regression guard. get_moderation_stats computes
        resolved_today by filtering ContentReport.resolved_at >= today's
        start AND status == RESOLVED - not created_at. A report filed
        yesterday but resolved today via the real /resolve endpoint should
        count; a report that's RESOLVED but was never actually processed
        through resolve_report/bulk_resolve_reports (resolved_at still NULL,
        e.g. a pre-migration row or a test fixture that sets status directly)
        should not, regardless of when it was created.
        """
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        yesterday = datetime.utcnow() - timedelta(days=1)

        # Created yesterday, resolved *today* via the real endpoint - should count.
        stale_report = await _make_report(
            db_session,
            reporter,
            "THREAD",
            uuid.uuid4(),
            reason="SPAM",
            status="PENDING",
            created_at=yesterday,
        )
        resolve_response = await client.post(
            f"/api/moderation/resolve/{stale_report.id}",
            json={"action": "dismiss"},
            headers=_headers_for(admin.id),
        )
        assert resolve_response.status_code == 200
        # dismiss doesn't count as RESOLVED - force status to RESOLVED directly
        # (resolved_at, set by the real endpoint above, is left untouched) to
        # isolate the resolved_at behavior from the dismiss/resolve distinction.
        await db_session.execute(
            text("UPDATE content_reports SET status = 'RESOLVED' WHERE id = :id"),
            {"id": stale_report.id},
        )
        await db_session.commit()

        # Created today, RESOLVED, but never actually processed through the
        # real endpoint - resolved_at is NULL, so it should NOT count.
        fresh_report = await _make_report(
            db_session,
            reporter,
            "THREAD",
            uuid.uuid4(),
            reason="SPAM",
            status="RESOLVED",
        )

        response = await client.get(
            "/api/moderation/stats", headers=_headers_for(admin.id)
        )

        assert response.status_code == 200
        data = response.json()
        # Only the report actually resolved today (via the real endpoint) is
        # counted, even though both reports are RESOLVED and fresh_report was
        # created today.
        assert data["resolved_today"] == 1
        assert fresh_report.id != stale_report.id

    @pytest.mark.asyncio
    async def test_forbidden_for_non_admin(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        non_admin = await _make_user(db_session)

        response = await client.get(
            "/api/moderation/stats", headers=_headers_for(non_admin.id)
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient):
        response = await client.get("/api/moderation/stats")
        assert response.status_code == 401


class TestGetReportDetail:
    """GET /api/moderation/report/{report_id}"""

    @pytest.mark.asyncio
    async def test_success_detail_shape(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        report = await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), reason="SPAM"
        )

        response = await client.get(
            f"/api/moderation/report/{report.id}", headers=_headers_for(admin.id)
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(report.id)
        assert data["content_type"] == "THREAD"
        assert data["reason"] == "SPAM"
        assert data["status"] == "PENDING"
        assert data["reporter"]["id"] == str(reporter.id)

    @pytest.mark.asyncio
    async def test_404_for_missing_report(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)

        response = await client.get(
            f"/api/moderation/report/{uuid.uuid4()}", headers=_headers_for(admin.id)
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_reported_user_populated_for_user_type(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        target = await _make_user(db_session, name="Target Name")
        report = await _make_report(db_session, reporter, "USER", target.id)

        response = await client.get(
            f"/api/moderation/report/{report.id}", headers=_headers_for(admin.id)
        )

        assert response.status_code == 200
        data = response.json()
        assert data["reported_user"]["id"] == str(target.id)
        assert data["reported_user"]["name"] == "Target Name"

    @pytest.mark.asyncio
    async def test_forbidden_for_non_admin(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        non_admin = await _make_user(db_session)
        reporter = await _make_user(db_session)
        report = await _make_report(db_session, reporter, "THREAD", uuid.uuid4())

        response = await client.get(
            f"/api/moderation/report/{report.id}",
            headers=_headers_for(non_admin.id),
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient):
        response = await client.get(f"/api/moderation/report/{uuid.uuid4()}")
        assert response.status_code == 401


class TestResolveReport:
    """POST /api/moderation/resolve/{report_id}"""

    @pytest.mark.asyncio
    async def test_404_for_missing_report(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)

        response = await client.post(
            f"/api/moderation/resolve/{uuid.uuid4()}",
            json={"action": "dismiss"},
            headers=_headers_for(admin.id),
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_400_when_already_resolved(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        report = await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), status="RESOLVED"
        )

        response = await client.post(
            f"/api/moderation/resolve/{report.id}",
            json={"action": "dismiss"},
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Report has already been resolved"

    @pytest.mark.asyncio
    async def test_400_for_invalid_action(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        report = await _make_report(db_session, reporter, "THREAD", uuid.uuid4())

        response = await client.post(
            f"/api/moderation/resolve/{report.id}",
            json={"action": "nuke_from_orbit"},
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_action_is_case_insensitive(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        report = await _make_report(db_session, reporter, "THREAD", uuid.uuid4())

        response = await client.post(
            f"/api/moderation/resolve/{report.id}",
            json={"action": "DISMISS"},
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["action"] == "dismiss"
        assert data["new_status"] == "DISMISSED"

    @pytest.mark.asyncio
    async def test_dismiss_sets_dismissed_without_side_effects(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        category = await _make_category(db_session)
        thread = await _make_thread(db_session, category, reporter)
        report = await _make_report(db_session, reporter, "THREAD", thread.id)

        response = await client.post(
            f"/api/moderation/resolve/{report.id}",
            json={"action": "dismiss"},
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["report_id"] == str(report.id)
        assert data["new_status"] == "DISMISSED"

        still_there = await db_session.get(ForumThread, thread.id)
        assert still_there is not None

    @pytest.mark.asyncio
    async def test_delete_content_removes_thread_row(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        category = await _make_category(db_session)
        thread = await _make_thread(db_session, category, reporter)
        report = await _make_report(db_session, reporter, "THREAD", thread.id)

        response = await client.post(
            f"/api/moderation/resolve/{report.id}",
            json={"action": "delete_content"},
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 200
        assert response.json()["new_status"] == "RESOLVED"

        deleted = await db_session.get(ForumThread, thread.id)
        assert deleted is None

    @pytest.mark.asyncio
    async def test_delete_content_removes_post_row(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        category = await _make_category(db_session)
        thread = await _make_thread(db_session, category, reporter)
        post = await _make_post(db_session, thread, reporter)
        report = await _make_report(db_session, reporter, "POST", post.id)

        response = await client.post(
            f"/api/moderation/resolve/{report.id}",
            json={"action": "delete_content"},
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 200
        deleted = await db_session.get(ForumPost, post.id)
        assert deleted is None

    @pytest.mark.asyncio
    async def test_ban_user_deactivates_user_for_user_content_type(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        target = await _make_user(db_session, is_active=True)
        report = await _make_report(db_session, reporter, "USER", target.id)

        response = await client.post(
            f"/api/moderation/resolve/{report.id}",
            json={"action": "ban_user"},
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 200
        assert response.json()["new_status"] == "RESOLVED"

        await db_session.refresh(target)
        assert target.is_active is False

    @pytest.mark.asyncio
    async def test_ban_user_has_no_destructive_effect_for_non_user_content_type(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """
        The ban_user branch in resolve_report only deactivates a user when
        report.content_type == "USER". For a THREAD/POST/STATUS report, the
        action still succeeds and marks the report RESOLVED, but performs no
        deletion or deactivation at all - it's effectively a no-op action
        for non-USER content, distinct from delete_content.
        """
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        category = await _make_category(db_session)
        thread = await _make_thread(db_session, category, reporter)
        report = await _make_report(db_session, reporter, "THREAD", thread.id)

        response = await client.post(
            f"/api/moderation/resolve/{report.id}",
            json={"action": "ban_user"},
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 200
        assert response.json()["new_status"] == "RESOLVED"

        still_there = await db_session.get(ForumThread, thread.id)
        assert still_there is not None
        await db_session.refresh(reporter)
        assert reporter.is_active is True

    @pytest.mark.asyncio
    async def test_warn_user_resolves_without_error(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        target = await _make_user(db_session)
        report = await _make_report(db_session, reporter, "USER", target.id)

        with patch("app.services.warning_service.send_warning_email_task"):
            response = await client.post(
                f"/api/moderation/resolve/{report.id}",
                json={"action": "warn_user"},
                headers=_headers_for(admin.id),
            )

        assert response.status_code == 200
        data = response.json()
        assert data["action"] == "warn_user"
        assert data["new_status"] == "RESOLVED"

    @pytest.mark.asyncio
    async def test_reviewed_by_set_to_acting_admin(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        report = await _make_report(db_session, reporter, "THREAD", uuid.uuid4())

        response = await client.post(
            f"/api/moderation/resolve/{report.id}",
            json={"action": "dismiss"},
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 200
        await db_session.refresh(report)
        assert report.reviewed_by == admin.id

    @pytest.mark.asyncio
    async def test_forbidden_for_non_admin(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        non_admin = await _make_user(db_session)
        reporter = await _make_user(db_session)
        report = await _make_report(db_session, reporter, "THREAD", uuid.uuid4())

        response = await client.post(
            f"/api/moderation/resolve/{report.id}",
            json={"action": "dismiss"},
            headers=_headers_for(non_admin.id),
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient):
        response = await client.post(
            f"/api/moderation/resolve/{uuid.uuid4()}",
            json={"action": "dismiss"},
        )
        assert response.status_code == 401


class TestBulkResolveReports:
    """POST /api/moderation/bulk-resolve"""

    @pytest.mark.asyncio
    async def test_resolves_only_pending_reports(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        pending_one = await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), status="PENDING"
        )
        pending_two = await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), status="PENDING"
        )
        already_resolved = await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), status="RESOLVED"
        )

        response = await client.post(
            "/api/moderation/bulk-resolve",
            json={
                "report_ids": [
                    str(pending_one.id),
                    str(pending_two.id),
                    str(already_resolved.id),
                ],
                "request": {"action": "dismiss"},
            },
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["resolved_count"] == 2
        assert data["action"] == "dismiss"

        await db_session.refresh(pending_one)
        await db_session.refresh(pending_two)
        await db_session.refresh(already_resolved)
        assert pending_one.status == "DISMISSED"
        assert pending_two.status == "DISMISSED"
        # Untouched - stays RESOLVED, not silently overwritten.
        assert already_resolved.status == "RESOLVED"
        assert pending_one.reviewed_by == admin.id
        assert pending_two.reviewed_by == admin.id

    @pytest.mark.asyncio
    async def test_non_dismiss_action_sets_resolved(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_user(db_session, is_superuser=True)
        reporter = await _make_user(db_session)
        report = await _make_report(
            db_session, reporter, "THREAD", uuid.uuid4(), status="PENDING"
        )

        response = await client.post(
            "/api/moderation/bulk-resolve",
            json={
                "report_ids": [str(report.id)],
                "request": {"action": "delete_content"},
            },
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 200
        assert response.json()["resolved_count"] == 1
        await db_session.refresh(report)
        assert report.status == "RESOLVED"

    @pytest.mark.asyncio
    async def test_forbidden_for_non_admin(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        non_admin = await _make_user(db_session)
        reporter = await _make_user(db_session)
        report = await _make_report(db_session, reporter, "THREAD", uuid.uuid4())

        response = await client.post(
            "/api/moderation/bulk-resolve",
            json={"report_ids": [str(report.id)], "request": {"action": "dismiss"}},
            headers=_headers_for(non_admin.id),
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient):
        response = await client.post(
            "/api/moderation/bulk-resolve",
            json={"report_ids": [str(uuid.uuid4())], "request": {"action": "dismiss"}},
        )
        assert response.status_code == 401
