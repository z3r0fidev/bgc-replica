import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import Session, User
from app.services.session_service import session_service


def _token_for(user_id: uuid.UUID) -> str:
    secret = settings.NEXTAUTH_SECRET or settings.SECRET_KEY
    expire = datetime.now(timezone.utc) + timedelta(minutes=30)
    return jwt.encode(
        {"exp": expire, "sub": str(user_id)}, secret, algorithm=settings.ALGORITHM
    )


async def _make_user(db: AsyncSession) -> User:
    user = User(
        id=uuid.uuid4(),
        email=f"session-test-{uuid.uuid4()}@example.com",
        name="Session Test User",
        hashed_password="x",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _make_session(db: AsyncSession, user: User, **overrides) -> Session:
    fields = {
        "id": uuid.uuid4(),
        "session_token": str(uuid.uuid4()),
        "user_id": user.id,
        "expires": datetime.utcnow() + timedelta(days=30),
    }
    fields.update(overrides)
    session = Session(**fields)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


class TestParseUserAgent:
    def test_empty_string_returns_empty_dict(self):
        assert session_service.parse_user_agent("") == {}

    def test_none_returns_empty_dict(self):
        assert session_service.parse_user_agent(None) == {}

    def test_chrome_on_windows_desktop(self):
        ua = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        info = session_service.parse_user_agent(ua)
        assert info["browser"] == "Chrome"
        assert info["browser_version"] == "120"
        assert info["os"] == "Windows"
        assert info["os_version"] == "10.0"
        assert info["device_type"] == "desktop"

    def test_firefox_on_macos(self):
        ua = (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 "
            "Firefox/121.0"
        )
        info = session_service.parse_user_agent(ua)
        assert info["browser"] == "Firefox"
        assert info["os"] == "macOS"
        assert info["os_version"] == "14.1"

    def test_safari_on_iphone_is_mobile(self):
        ua = (
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) "
            "AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"
        )
        info = session_service.parse_user_agent(ua)
        assert info["browser"] == "Safari"
        assert info["os"] == "iOS"
        assert info["device_type"] == "mobile"

    def test_android_is_mobile(self):
        ua = (
            "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 "
            "Chrome/119.0.0.0 Mobile Safari/537.36"
        )
        info = session_service.parse_user_agent(ua)
        assert info["os"] == "Android"
        assert info["device_type"] == "mobile"

    def test_ipad_is_tablet(self):
        ua = (
            "Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 "
            "Safari/604.1"
        )
        info = session_service.parse_user_agent(ua)
        assert info["os"] == "iPadOS"
        assert info["device_type"] == "tablet"

    def test_edge_browser_detected(self):
        ua = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Edge/120.0.0.0"
        info = session_service.parse_user_agent(ua)
        assert info["browser"] == "Edge"

    def test_unrecognized_agent_defaults_to_desktop_with_no_browser_or_os(self):
        info = session_service.parse_user_agent("SomeUnknownBot/1.0")
        assert info["browser"] is None
        assert info["os"] is None
        assert info["device_type"] == "desktop"


class TestGetUserSessions:
    @pytest.mark.asyncio
    async def test_returns_only_this_users_active_sessions(
        self, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        other_user = await _make_user(db_session)
        mine = await _make_session(db_session, user)
        await _make_session(db_session, other_user)

        sessions, total = await session_service.get_user_sessions(db_session, user.id)

        assert total == 1
        assert sessions[0]["id"] == mine.id

    @pytest.mark.asyncio
    async def test_excludes_expired_sessions(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        await _make_session(
            db_session, user, expires=datetime.utcnow() - timedelta(days=1)
        )

        sessions, total = await session_service.get_user_sessions(db_session, user.id)

        assert total == 0
        assert sessions == []

    @pytest.mark.asyncio
    async def test_marks_current_session(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        current = await _make_session(db_session, user, session_token="current-tok")
        other = await _make_session(db_session, user, session_token="other-tok")

        sessions, _ = await session_service.get_user_sessions(
            db_session, user.id, current_session_token="current-tok"
        )

        by_id = {s["id"]: s["is_current"] for s in sessions}
        assert by_id[current.id] is True
        assert by_id[other.id] is False

    @pytest.mark.asyncio
    async def test_no_current_token_marks_nothing_current(
        self, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        await _make_session(db_session, user)

        sessions, _ = await session_service.get_user_sessions(db_session, user.id)

        assert all(s["is_current"] is False for s in sessions)


class TestRevokeSession:
    @pytest.mark.asyncio
    async def test_revokes_own_session(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        session = await _make_session(db_session, user)

        result = await session_service.revoke_session(db_session, user.id, session.id)

        assert result is True
        sessions, total = await session_service.get_user_sessions(db_session, user.id)
        assert total == 0

    @pytest.mark.asyncio
    async def test_returns_false_for_missing_session(self, db_session: AsyncSession):
        user = await _make_user(db_session)

        result = await session_service.revoke_session(
            db_session, user.id, uuid.uuid4()
        )

        assert result is False

    @pytest.mark.asyncio
    async def test_returns_false_for_another_users_session(
        self, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        other_user = await _make_user(db_session)
        other_session = await _make_session(db_session, other_user)

        result = await session_service.revoke_session(
            db_session, user.id, other_session.id
        )

        assert result is False
        sessions, total = await session_service.get_user_sessions(
            db_session, other_user.id
        )
        assert total == 1

    @pytest.mark.asyncio
    async def test_cannot_revoke_current_session(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        session = await _make_session(db_session, user, session_token="my-tok")

        result = await session_service.revoke_session(
            db_session, user.id, session.id, current_session_token="my-tok"
        )

        assert result is False
        _, total = await session_service.get_user_sessions(db_session, user.id)
        assert total == 1


class TestRevokeAllSessions:
    @pytest.mark.asyncio
    async def test_revokes_all_except_current(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        await _make_session(db_session, user, session_token="current-tok")
        await _make_session(db_session, user)
        await _make_session(db_session, user)

        count = await session_service.revoke_all_sessions(
            db_session, user.id, current_session_token="current-tok"
        )

        assert count == 2
        _, total = await session_service.get_user_sessions(db_session, user.id)
        assert total == 1

    @pytest.mark.asyncio
    async def test_revokes_everything_without_current_token(
        self, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        await _make_session(db_session, user)
        await _make_session(db_session, user)

        count = await session_service.revoke_all_sessions(db_session, user.id)

        assert count == 2
        _, total = await session_service.get_user_sessions(db_session, user.id)
        assert total == 0

    @pytest.mark.asyncio
    async def test_zero_sessions_returns_zero(self, db_session: AsyncSession):
        user = await _make_user(db_session)

        count = await session_service.revoke_all_sessions(db_session, user.id)

        assert count == 0

    @pytest.mark.asyncio
    async def test_only_current_session_revokes_zero(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        await _make_session(db_session, user, session_token="current-tok")

        count = await session_service.revoke_all_sessions(
            db_session, user.id, current_session_token="current-tok"
        )

        assert count == 0


class TestUpdateSessionActivity:
    @pytest.mark.asyncio
    async def test_updates_last_active(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        session = await _make_session(db_session, user, last_active=None)

        await session_service.update_session_activity(db_session, session.session_token)

        await db_session.refresh(session)
        assert session.last_active is not None

    @pytest.mark.asyncio
    async def test_sets_ip_only_when_not_already_set(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        session = await _make_session(db_session, user, ip_address=None)

        await session_service.update_session_activity(
            db_session, session.session_token, ip_address="1.2.3.4"
        )

        await db_session.refresh(session)
        assert session.ip_address == "1.2.3.4"

    @pytest.mark.asyncio
    async def test_does_not_overwrite_existing_ip(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        session = await _make_session(db_session, user, ip_address="9.9.9.9")

        await session_service.update_session_activity(
            db_session, session.session_token, ip_address="1.2.3.4"
        )

        await db_session.refresh(session)
        assert session.ip_address == "9.9.9.9"

    @pytest.mark.asyncio
    async def test_sets_device_info_from_user_agent_when_not_already_set(
        self, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        session = await _make_session(db_session, user, device_info=None)
        ua = "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0 Safari/537.36"

        await session_service.update_session_activity(
            db_session, session.session_token, user_agent=ua
        )

        await db_session.refresh(session)
        assert session.device_info["browser"] == "Chrome"
        assert session.user_agent == ua

    @pytest.mark.asyncio
    async def test_does_not_overwrite_existing_device_info(
        self, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        session = await _make_session(
            db_session, user, device_info={"browser": "Firefox"}
        )

        await session_service.update_session_activity(
            db_session,
            session.session_token,
            user_agent="Mozilla/5.0 Chrome/120.0.0.0",
        )

        await db_session.refresh(session)
        assert session.device_info == {"browser": "Firefox"}

    @pytest.mark.asyncio
    async def test_unknown_token_is_a_noop(self, db_session: AsyncSession):
        await session_service.update_session_activity(
            db_session, "no-such-token", ip_address="1.2.3.4"
        )  # should not raise


class TestSessionsApi:
    @pytest.mark.asyncio
    async def test_list_sessions_marks_current_via_bearer_token(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        token = _token_for(user.id)
        current = await _make_session(db_session, user, session_token=token)
        other = await _make_session(db_session, user)

        response = await client.get(
            "/api/sessions", headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        by_id = {s["id"]: s["is_current"] for s in data["sessions"]}
        assert by_id[str(current.id)] is True
        assert by_id[str(other.id)] is False

    @pytest.mark.asyncio
    async def test_list_sessions_includes_parsed_device_info(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        token = _token_for(user.id)
        await _make_session(
            db_session,
            user,
            session_token=token,
            device_info={"browser": "Chrome", "device_type": "desktop"},
        )

        response = await client.get(
            "/api/sessions", headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        assert response.json()["sessions"][0]["device_info"]["browser"] == "Chrome"

    @pytest.mark.asyncio
    async def test_revoke_session_success(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        token = _token_for(user.id)
        target = await _make_session(db_session, user)

        response = await client.delete(
            f"/api/sessions/{target.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["success"] is True

    @pytest.mark.asyncio
    async def test_revoke_current_session_400s(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        token = _token_for(user.id)
        current = await _make_session(db_session, user, session_token=token)

        response = await client.delete(
            f"/api/sessions/{current.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_revoke_missing_session_400s(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        token = _token_for(user.id)

        response = await client.delete(
            f"/api/sessions/{uuid.uuid4()}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_revoke_all_sessions_preserves_current(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        token = _token_for(user.id)
        await _make_session(db_session, user, session_token=token)
        await _make_session(db_session, user)
        await _make_session(db_session, user)

        response = await client.delete(
            "/api/sessions", headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        assert response.json()["revoked_count"] == 2
        list_response = await client.get(
            "/api/sessions", headers={"Authorization": f"Bearer {token}"}
        )
        assert list_response.json()["total"] == 1
