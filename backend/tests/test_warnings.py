import uuid
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User, AdminActionLog
from app.models.community import ContentReport, StatusUpdate
from app.models.moderation import Warning
from app.services.warning_service import warning_service


async def _make_user(db: AsyncSession, **overrides) -> User:
    user = User(
        id=uuid.uuid4(),
        email=f"warn-target-{uuid.uuid4()}@example.com",
        name="Warn Target",
        hashed_password="hashed_password",
        is_active=True,
        **overrides,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


class TestIssueWarning:
    @pytest.mark.asyncio
    async def test_creates_warning_and_action_log(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        admin = await _make_user(db_session, is_superuser=True)
        admin_id = admin.id

        with patch(
            "app.services.warning_service.send_warning_email_task"
        ) as mock_task:
            warning, escalated = await warning_service.issue_warning(
                db_session,
                user_id=user.id,
                admin_id=admin_id,
                reason="Repeated spam posting",
            )

        assert escalated is False
        assert warning.reason == "Repeated spam posting"
        assert warning.status == "ACTIVE"
        assert warning.triggered_escalation is False
        mock_task.delay.assert_called_once()
        assert mock_task.delay.call_args.kwargs["warning_count"] == 1
        assert mock_task.delay.call_args.kwargs["escalated"] is False

        result = await db_session.execute(
            AdminActionLog.__table__.select().where(
                AdminActionLog.target_user_id == user.id,
                AdminActionLog.action == "WARN_USER",
            )
        )
        assert result.first() is not None

    @pytest.mark.asyncio
    async def test_below_threshold_does_not_suspend(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        admin = await _make_user(db_session, is_superuser=True)
        admin_id = admin.id

        for _ in range(settings.WARNING_ESCALATION_THRESHOLD - 1):
            with patch("app.services.warning_service.send_warning_email_task"):
                await warning_service.issue_warning(
                    db_session, user_id=user.id, admin_id=admin_id, reason="Warning"
                )

        await db_session.refresh(user)
        assert user.suspended_at is None

    @pytest.mark.asyncio
    async def test_nth_warning_triggers_suspension(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        admin = await _make_user(db_session, is_superuser=True)
        admin_id = admin.id
        threshold = settings.WARNING_ESCALATION_THRESHOLD

        escalated = False
        for _ in range(threshold):
            with patch("app.services.warning_service.send_warning_email_task"):
                _, escalated = await warning_service.issue_warning(
                    db_session, user_id=user.id, admin_id=admin_id, reason="Warning"
                )

        assert escalated is True
        await db_session.refresh(user)
        assert user.suspended_at is not None
        assert user.suspended_until is not None
        assert user.suspension_reason is not None

        result = await db_session.execute(
            AdminActionLog.__table__.select().where(
                AdminActionLog.target_user_id == user.id,
                AdminActionLog.action == "AUTO_SUSPEND_ESCALATION",
            )
        )
        assert result.first() is not None

    @pytest.mark.asyncio
    async def test_threshold_respects_settings_override(
        self, db_session: AsyncSession, monkeypatch
    ):
        monkeypatch.setattr(settings, "WARNING_ESCALATION_THRESHOLD", 2)
        user = await _make_user(db_session)
        admin = await _make_user(db_session, is_superuser=True)
        admin_id = admin.id

        with patch("app.services.warning_service.send_warning_email_task"):
            _, first_escalated = await warning_service.issue_warning(
                db_session, user_id=user.id, admin_id=admin_id, reason="First"
            )
            _, second_escalated = await warning_service.issue_warning(
                db_session, user_id=user.id, admin_id=admin_id, reason="Second"
            )

        assert first_escalated is False
        assert second_escalated is True

    @pytest.mark.asyncio
    async def test_revoked_warning_excluded_from_active_count(
        self, db_session: AsyncSession, monkeypatch
    ):
        monkeypatch.setattr(settings, "WARNING_ESCALATION_THRESHOLD", 2)
        user = await _make_user(db_session)
        admin = await _make_user(db_session, is_superuser=True)
        admin_id = admin.id

        with patch("app.services.warning_service.send_warning_email_task"):
            warning, _ = await warning_service.issue_warning(
                db_session, user_id=user.id, admin_id=admin_id, reason="First"
            )

        warning.status = "REVOKED"
        await db_session.commit()

        with patch("app.services.warning_service.send_warning_email_task"):
            _, escalated = await warning_service.issue_warning(
                db_session, user_id=user.id, admin_id=admin_id, reason="Second"
            )

        # Revoked warning shouldn't count toward the threshold-of-2
        assert escalated is False

    @pytest.mark.asyncio
    async def test_notify_false_skips_email(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        admin = await _make_user(db_session, is_superuser=True)
        admin_id = admin.id

        with patch(
            "app.services.warning_service.send_warning_email_task"
        ) as mock_task:
            await warning_service.issue_warning(
                db_session,
                user_id=user.id,
                admin_id=admin_id,
                reason="Silent warning",
                notify=False,
            )

        mock_task.delay.assert_not_called()

    @pytest.mark.asyncio
    async def test_email_task_never_awaited_inline(self, db_session: AsyncSession):
        """issue_warning must not block on email delivery - .delay() only."""
        user = await _make_user(db_session)
        admin = await _make_user(db_session, is_superuser=True)
        admin_id = admin.id

        with patch(
            "app.services.warning_service.send_warning_email_task"
        ) as mock_task:
            mock_task.delay.side_effect = Exception("Celery/Redis unavailable")
            with pytest.raises(Exception, match="Celery/Redis unavailable"):
                await warning_service.issue_warning(
                    db_session, user_id=user.id, admin_id=admin_id, reason="Warning"
                )

        # The warning row itself must already be committed before .delay() runs
        result = await db_session.execute(
            Warning.__table__.select().where(Warning.user_id == user.id)
        )
        assert result.first() is not None


class TestIssueWarningEndpoint:
    @pytest.mark.asyncio
    async def test_issue_warning_as_admin(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        with patch("app.services.warning_service.send_warning_email_task"):
            response = await client.post(
                f"/api/admin/users/{user.id}/warnings",
                json={"reason": "Repeated spam posting in forums"},
                headers=admin_auth_headers,
            )

        assert response.status_code == 200
        data = response.json()
        assert data["warning"]["reason"] == "Repeated spam posting in forums"
        assert data["escalated"] is False
        assert data["active_count"] == 1

    @pytest.mark.asyncio
    async def test_issue_warning_requires_admin(
        self, client: AsyncClient, token: str, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            f"/api/admin/users/{user.id}/warnings",
            json={"reason": "Repeated spam posting in forums"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_issue_warning_rejects_short_reason(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            f"/api/admin/users/{user.id}/warnings",
            json={"reason": "short"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 422


class TestGetUserWarningsEndpoint:
    @pytest.mark.asyncio
    async def test_pagination_and_active_count(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        with patch("app.services.warning_service.send_warning_email_task"):
            for i in range(2):
                await client.post(
                    f"/api/admin/users/{user.id}/warnings",
                    json={"reason": f"Warning reason number {i}"},
                    headers=admin_auth_headers,
                )

        response = await client.get(
            f"/api/admin/users/{user.id}/warnings",
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert data["active_count"] == 2
        assert len(data["items"]) == 2

    @pytest.mark.asyncio
    async def test_filter_by_status(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        with patch("app.services.warning_service.send_warning_email_task"):
            issue_response = await client.post(
                f"/api/admin/users/{user.id}/warnings",
                json={"reason": "Warning to be revoked later"},
                headers=admin_auth_headers,
            )
        warning_id = issue_response.json()["warning"]["id"]

        await client.post(
            f"/api/admin/users/{user.id}/warnings/{warning_id}/revoke",
            json={"reason": "Issued in error"},
            headers=admin_auth_headers,
        )

        active_response = await client.get(
            f"/api/admin/users/{user.id}/warnings?status=ACTIVE",
            headers=admin_auth_headers,
        )
        revoked_response = await client.get(
            f"/api/admin/users/{user.id}/warnings?status=REVOKED",
            headers=admin_auth_headers,
        )

        assert active_response.json()["total"] == 0
        assert revoked_response.json()["total"] == 1
        assert revoked_response.json()["active_count"] == 0


class TestRevokeWarningEndpoint:
    @pytest.mark.asyncio
    async def test_revoke_excludes_from_active_count(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        with patch("app.services.warning_service.send_warning_email_task"):
            issue_response = await client.post(
                f"/api/admin/users/{user.id}/warnings",
                json={"reason": "Warning to be revoked later"},
                headers=admin_auth_headers,
            )
        warning_id = issue_response.json()["warning"]["id"]

        revoke_response = await client.post(
            f"/api/admin/users/{user.id}/warnings/{warning_id}/revoke",
            json={"reason": "Issued in error"},
            headers=admin_auth_headers,
        )
        assert revoke_response.status_code == 200

        history_response = await client.get(
            f"/api/admin/users/{user.id}/warnings",
            headers=admin_auth_headers,
        )
        assert history_response.json()["active_count"] == 0

    @pytest.mark.asyncio
    async def test_revoke_already_revoked_fails(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        with patch("app.services.warning_service.send_warning_email_task"):
            issue_response = await client.post(
                f"/api/admin/users/{user.id}/warnings",
                json={"reason": "Warning to be revoked twice"},
                headers=admin_auth_headers,
            )
        warning_id = issue_response.json()["warning"]["id"]

        await client.post(
            f"/api/admin/users/{user.id}/warnings/{warning_id}/revoke",
            json={"reason": "First revoke"},
            headers=admin_auth_headers,
        )
        second_response = await client.post(
            f"/api/admin/users/{user.id}/warnings/{warning_id}/revoke",
            json={"reason": "Second revoke"},
            headers=admin_auth_headers,
        )

        assert second_response.status_code == 400


class TestResolveReportWarnUser:
    @pytest.mark.asyncio
    async def test_warns_post_author_not_reporter(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        author = await _make_user(db_session)
        reporter = await _make_user(db_session)

        status_update = StatusUpdate(
            id=uuid.uuid4(), author_id=author.id, content="Some reported content"
        )
        db_session.add(status_update)
        await db_session.commit()

        report = ContentReport(
            id=uuid.uuid4(),
            reporter_id=reporter.id,
            content_type="STATUS",
            content_id=status_update.id,
            reason="Inappropriate content",
        )
        db_session.add(report)
        await db_session.commit()
        await db_session.refresh(report)

        with patch("app.services.warning_service.send_warning_email_task"):
            response = await client.post(
                f"/api/moderation/resolve/{report.id}",
                json={"action": "warn_user"},
                headers=admin_auth_headers,
            )

        assert response.status_code == 200
        assert response.json()["new_status"] == "RESOLVED"

        warnings_response = await client.get(
            f"/api/admin/users/{author.id}/warnings",
            headers=admin_auth_headers,
        )
        assert warnings_response.json()["total"] == 1

        reporter_warnings_response = await client.get(
            f"/api/admin/users/{reporter.id}/warnings",
            headers=admin_auth_headers,
        )
        assert reporter_warnings_response.json()["total"] == 0

    @pytest.mark.asyncio
    async def test_warns_reported_user_directly(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        target = await _make_user(db_session)
        reporter = await _make_user(db_session)

        report = ContentReport(
            id=uuid.uuid4(),
            reporter_id=reporter.id,
            content_type="USER",
            content_id=target.id,
            reason="Harassment",
        )
        db_session.add(report)
        await db_session.commit()
        await db_session.refresh(report)

        with patch("app.services.warning_service.send_warning_email_task"):
            response = await client.post(
                f"/api/moderation/resolve/{report.id}",
                json={"action": "warn_user"},
                headers=admin_auth_headers,
            )

        assert response.status_code == 200

        warnings_response = await client.get(
            f"/api/admin/users/{target.id}/warnings",
            headers=admin_auth_headers,
        )
        assert warnings_response.json()["total"] == 1
        assert warnings_response.json()["items"][0]["report_id"] == str(report.id)


class TestModerationStatusReportPartitionRegression:
    """Regression coverage for the three db.get(StatusUpdate, ...) call sites
    fixed when StatusUpdate gained a composite (id, created_at) primary key
    (issue #66 partitioning). Each of these would hard-fail with
    sqlalchemy.exc.InvalidRequestError pre-fix."""

    @pytest.mark.asyncio
    async def test_queue_listing_includes_status_content_preview(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        author = await _make_user(db_session)
        reporter = await _make_user(db_session)

        status_update = StatusUpdate(
            id=uuid.uuid4(), author_id=author.id, content="Reported status content"
        )
        db_session.add(status_update)
        await db_session.commit()

        report = ContentReport(
            id=uuid.uuid4(),
            reporter_id=reporter.id,
            content_type="STATUS",
            content_id=status_update.id,
            reason="Spam",
        )
        db_session.add(report)
        await db_session.commit()

        response = await client.get(
            "/api/moderation/queue?content_type=STATUS",
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        items = [r for r in response.json() if r["id"] == str(report.id)]
        assert len(items) == 1
        assert items[0]["content_preview"] == "Reported status content"

    @pytest.mark.asyncio
    async def test_delete_content_removes_status_update(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession
    ):
        author = await _make_user(db_session)
        reporter = await _make_user(db_session)

        status_update = StatusUpdate(
            id=uuid.uuid4(), author_id=author.id, content="To be deleted"
        )
        db_session.add(status_update)
        await db_session.commit()

        report = ContentReport(
            id=uuid.uuid4(),
            reporter_id=reporter.id,
            content_type="STATUS",
            content_id=status_update.id,
            reason="Inappropriate",
        )
        db_session.add(report)
        await db_session.commit()
        await db_session.refresh(report)

        response = await client.post(
            f"/api/moderation/resolve/{report.id}",
            json={"action": "delete_content"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        remaining = (
            await db_session.execute(
                text("SELECT count(*) FROM status_updates WHERE id = :id"),
                {"id": status_update.id},
            )
        ).scalar_one()
        assert remaining == 0


class TestMessageForeignKeyCascade:
    """DB-level ON DELETE CASCADE coverage for messages, exercised via raw
    SQL so it's independent of ORM session-level cascade (which only fires
    when children are already loaded)."""

    @pytest.mark.asyncio
    async def test_raw_sql_room_delete_cascades_to_messages(
        self, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        room_id = uuid.uuid4()
        message_id = uuid.uuid4()

        await db_session.execute(
            text(
                "INSERT INTO chat_rooms (id, name, category, is_public, created_at) "
                "VALUES (:id, :name, 'general', true, now())"
            ),
            {"id": room_id, "name": f"room-{room_id}"},
        )
        await db_session.execute(
            text(
                "INSERT INTO messages (id, room_id, sender_id, content, type, created_at) "
                "VALUES (:id, :room_id, :sender_id, 'hi', 'TEXT', now())"
            ),
            {"id": message_id, "room_id": room_id, "sender_id": user.id},
        )
        await db_session.commit()

        # Raw SQL delete, never loaded into the ORM session - proves the
        # DB-level FK constraint fires the cascade on its own.
        await db_session.execute(
            text("DELETE FROM chat_rooms WHERE id = :id"), {"id": room_id}
        )
        await db_session.commit()

        remaining = (
            await db_session.execute(
                text("SELECT count(*) FROM messages WHERE id = :id"),
                {"id": message_id},
            )
        ).scalar_one()
        assert remaining == 0
