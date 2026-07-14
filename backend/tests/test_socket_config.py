import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import socket_config as sc
from app.core.config import settings
from app.models.user import User
from app.services.presence import presence_service


def _make_token(user_id: str, secret: str | None = None, algorithm: str | None = None) -> str:
    secret = secret if secret is not None else (settings.NEXTAUTH_SECRET or settings.SECRET_KEY)
    expire = datetime.now(timezone.utc) + timedelta(minutes=30)
    return jwt.encode(
        {"exp": expire, "sub": user_id}, secret, algorithm=algorithm or settings.ALGORITHM
    )


async def _make_user(db: AsyncSession) -> User:
    user = User(
        id=uuid.uuid4(),
        email=f"socket-test-{uuid.uuid4()}@example.com",
        name="Socket Test User",
        hashed_password="x",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
def mock_sio(monkeypatch):
    mocks = {
        "save_session": AsyncMock(),
        "get_session": AsyncMock(return_value=None),
        "enter_room": AsyncMock(),
        "leave_room": AsyncMock(),
        "emit": AsyncMock(),
    }
    for name, mock in mocks.items():
        monkeypatch.setattr(sc.sio, name, mock)
    return mocks


class TestValidateJwtToken:
    def test_valid_token_with_sub_claim(self):
        user_id = str(uuid.uuid4())
        token = _make_token(user_id)

        assert sc.validate_jwt_token(token) == user_id

    def test_valid_token_with_nested_user_id_claim(self):
        user_id = str(uuid.uuid4())
        secret = settings.NEXTAUTH_SECRET or settings.SECRET_KEY
        expire = datetime.now(timezone.utc) + timedelta(minutes=30)
        token = jwt.encode(
            {"exp": expire, "user": {"id": user_id}}, secret, algorithm=settings.ALGORITHM
        )

        assert sc.validate_jwt_token(token) == user_id

    def test_malformed_token_returns_none(self):
        assert sc.validate_jwt_token("not-a-real-token") is None

    def test_valid_token_with_no_user_id_claim_returns_none(self):
        secret = settings.NEXTAUTH_SECRET or settings.SECRET_KEY
        expire = datetime.now(timezone.utc) + timedelta(minutes=30)
        token = jwt.encode({"exp": expire}, secret, algorithm=settings.ALGORITHM)

        assert sc.validate_jwt_token(token) is None

    def test_token_with_non_uuid_sub_returns_none(self):
        token = _make_token("not-a-uuid")

        assert sc.validate_jwt_token(token) is None

    def test_token_signed_with_wrong_secret_returns_none(self):
        token = _make_token(str(uuid.uuid4()), secret="wrong-secret")

        assert sc.validate_jwt_token(token) is None

    def test_expired_token_returns_none(self):
        secret = settings.NEXTAUTH_SECRET or settings.SECRET_KEY
        expired = datetime.now(timezone.utc) - timedelta(minutes=5)
        token = jwt.encode(
            {"exp": expired, "sub": str(uuid.uuid4())}, secret, algorithm=settings.ALGORITHM
        )

        assert sc.validate_jwt_token(token) is None


class TestExtractTokenFromCookies:
    def test_empty_header_returns_none(self):
        assert sc.extract_token_from_cookies("") is None

    def test_no_matching_cookie_returns_none(self):
        assert sc.extract_token_from_cookies("foo=bar; baz=qux") is None

    def test_extracts_next_auth_session_token(self):
        header = "foo=bar; next-auth.session-token=abc123; other=1"

        assert sc.extract_token_from_cookies(header) == "abc123"

    def test_extracts_secure_prefixed_session_token(self):
        header = "__Secure-next-auth.session-token=xyz789"

        assert sc.extract_token_from_cookies(header) == "xyz789"


class TestCheckRateLimit:
    @pytest.mark.asyncio
    async def test_allows_all_when_redis_unavailable(self, monkeypatch):
        monkeypatch.setattr(sc, "_redis_available", False)

        for _ in range(10):
            assert await sc.check_rate_limit(str(uuid.uuid4())) is True

    @pytest.mark.asyncio
    async def test_allows_up_to_five_then_blocks(self, monkeypatch):
        monkeypatch.setattr(sc, "_redis_available", True)
        user_id = str(uuid.uuid4())

        results = [await sc.check_rate_limit(user_id) for _ in range(6)]

        assert results == [True, True, True, True, True, False]

    @pytest.mark.asyncio
    async def test_allows_on_redis_error(self, monkeypatch):
        monkeypatch.setattr(sc, "_redis_available", True)

        async def _broken_get_redis():
            raise ConnectionError("redis is down")

        monkeypatch.setattr(sc, "get_redis", _broken_get_redis)

        assert await sc.check_rate_limit(str(uuid.uuid4())) is True


class TestInitializeRedisManager:
    @pytest.mark.asyncio
    async def test_no_redis_url_returns_false(self, monkeypatch):
        monkeypatch.setattr(settings, "REDIS_URL", "")

        assert await sc.initialize_redis_manager() is False

    @pytest.mark.asyncio
    async def test_unreachable_redis_returns_false(self, monkeypatch):
        monkeypatch.setattr(settings, "REDIS_URL", "redis://localhost:1/0")
        monkeypatch.setattr(sc, "_redis_available", True)

        result = await sc.initialize_redis_manager()

        assert result is False
        assert sc.is_redis_available() is False

    @pytest.mark.asyncio
    async def test_reachable_redis_returns_true(self, monkeypatch):
        original_manager = sc.sio.manager
        try:
            result = await sc.initialize_redis_manager()

            assert result is True
            assert sc.is_redis_available() is True
        finally:
            monkeypatch.setattr(sc, "_redis_available", False)
            sc.sio.manager = original_manager


class TestConnectHandler:
    @pytest.mark.asyncio
    async def test_valid_token_in_auth_payload_accepts(self, mock_sio):
        user_id = str(uuid.uuid4())
        token = _make_token(user_id)

        result = await sc.connect("sid1", {"HTTP_ORIGIN": "http://localhost:3000"}, {"token": token})

        assert result is None
        mock_sio["save_session"].assert_awaited_once_with("sid1", {"user_id": user_id})
        mock_sio["enter_room"].assert_awaited_once_with("sid1", user_id)
        assert await presence_service.is_user_online(uuid.UUID(user_id)) is True

    @pytest.mark.asyncio
    async def test_valid_token_in_cookies_accepts(self, mock_sio):
        user_id = str(uuid.uuid4())
        token = _make_token(user_id)
        environ = {
            "HTTP_COOKIE": f"next-auth.session-token={token}",
            "HTTP_ORIGIN": "http://localhost:3000",
        }

        result = await sc.connect("sid2", environ, None)

        assert result is None
        mock_sio["save_session"].assert_awaited_once_with("sid2", {"user_id": user_id})

    @pytest.mark.asyncio
    async def test_disallowed_origin_rejects(self, mock_sio):
        user_id = str(uuid.uuid4())
        token = _make_token(user_id)

        result = await sc.connect(
            "sid3", {"HTTP_ORIGIN": "https://evil.example.com"}, {"token": token}
        )

        assert result is False
        mock_sio["save_session"].assert_not_awaited()

    @pytest.mark.asyncio
    async def test_no_token_rejected_when_not_debug(self, mock_sio, monkeypatch):
        monkeypatch.setattr(settings, "DEBUG", False)

        result = await sc.connect("sid4", {}, None)

        assert result is False
        mock_sio["save_session"].assert_not_awaited()

    @pytest.mark.asyncio
    async def test_no_token_allowed_when_debug(self, mock_sio, monkeypatch):
        monkeypatch.setattr(settings, "DEBUG", True)

        result = await sc.connect("sid5", {}, None)

        assert result is None
        mock_sio["save_session"].assert_not_awaited()

    @pytest.mark.asyncio
    async def test_exception_during_connect_rejects(self, mock_sio):
        mock_sio["save_session"].side_effect = RuntimeError("boom")
        user_id = str(uuid.uuid4())
        token = _make_token(user_id)

        result = await sc.connect(
            "sid6", {"HTTP_ORIGIN": "http://localhost:3000"}, {"token": token}
        )

        assert result is False


class TestDisconnectHandler:
    @pytest.mark.asyncio
    async def test_updates_presence_offline_when_session_present(self, mock_sio):
        from app.core.redis_config import get_redis

        user_id = str(uuid.uuid4())
        await presence_service.update_presence(uuid.UUID(user_id), "online")
        mock_sio["get_session"].return_value = {"user_id": user_id}

        await sc.disconnect("sid1")

        # is_user_online() only reflects recency (any update_presence call
        # refreshes it, regardless of status string), so check the actual
        # status key update_presence writes rather than is_user_online().
        redis = await get_redis()
        assert await redis.get(f"presence:status:{user_id}") == "offline"

    @pytest.mark.asyncio
    async def test_no_session_is_a_noop(self, mock_sio):
        mock_sio["get_session"].return_value = {}

        await sc.disconnect("sid2")  # should not raise


class TestPresenceHandler:
    @pytest.mark.asyncio
    async def test_updates_presence_with_given_status(self, mock_sio):
        user_id = str(uuid.uuid4())
        mock_sio["get_session"].return_value = {"user_id": user_id}

        await sc.presence("sid1", {"status": "idle"})

        # idle counts as "seen recently" for is_user_online's 60s window
        assert await presence_service.is_user_online(uuid.UUID(user_id)) is True


class TestTypingHandler:
    @pytest.mark.asyncio
    async def test_no_session_is_a_noop(self, mock_sio):
        mock_sio["get_session"].return_value = None

        await sc.typing("sid1", {"room_id": "room-a"})

        mock_sio["emit"].assert_not_awaited()

    @pytest.mark.asyncio
    async def test_emits_to_room(self, mock_sio):
        user_id = str(uuid.uuid4())
        mock_sio["get_session"].return_value = {"user_id": user_id}

        await sc.typing("sid1", {"room_id": "room-a"})

        mock_sio["emit"].assert_awaited_once_with(
            "user_typing", {"user_id": user_id, "is_typing": True}, room="room-a", skip_sid="sid1"
        )

    @pytest.mark.asyncio
    async def test_emits_to_recipient_when_not_blocked(
        self, mock_sio, db_session: AsyncSession, monkeypatch
    ):
        sender = await _make_user(db_session)
        recipient = await _make_user(db_session)
        mock_sio["get_session"].return_value = {"user_id": str(sender.id)}
        # typing() opens its own `async with SessionLocal() as db:` - point it
        # at this test's db_session so it sees the sender/recipient rows
        # created above (a fresh SessionLocal() on a separate connection
        # would not, per SQLAlchemy's connection-bound-session isolation).
        monkeypatch.setattr(sc, "SessionLocal", lambda: db_session)

        await sc.typing("sid1", {"recipient_id": str(recipient.id)})

        mock_sio["emit"].assert_awaited_once_with(
            "user_typing",
            {"user_id": str(sender.id), "is_typing": True},
            room=str(recipient.id),
            skip_sid="sid1",
        )

    @pytest.mark.asyncio
    async def test_silently_ignored_when_blocked(
        self, mock_sio, db_session: AsyncSession, monkeypatch
    ):
        from app.services.block_service import block_service

        sender = await _make_user(db_session)
        recipient = await _make_user(db_session)
        await block_service.block_user(db_session, sender.id, recipient.id)
        mock_sio["get_session"].return_value = {"user_id": str(sender.id)}
        monkeypatch.setattr(sc, "SessionLocal", lambda: db_session)

        await sc.typing("sid1", {"recipient_id": str(recipient.id)})

        mock_sio["emit"].assert_not_awaited()


class TestJoinRoomHandler:
    @pytest.mark.asyncio
    async def test_joins_room_and_broadcasts_system_message(self, mock_sio):
        user_id = str(uuid.uuid4())
        mock_sio["get_session"].return_value = {"user_id": user_id}
        room_id = str(uuid.uuid4())

        await sc.join_room("sid1", {"room_id": room_id})

        mock_sio["enter_room"].assert_awaited_once_with("sid1", room_id)
        mock_sio["emit"].assert_awaited_once()
        event_name, payload = mock_sio["emit"].call_args.args
        assert event_name == "new_room_message"
        assert payload["type"] == "SYSTEM"
        assert payload["room_id"] == room_id
        assert user_id[:8] in payload["content"]

    @pytest.mark.asyncio
    async def test_anonymous_join_uses_anonymous_label(self, mock_sio):
        mock_sio["get_session"].return_value = None
        room_id = str(uuid.uuid4())

        await sc.join_room("sid1", {"room_id": room_id})

        event_name, payload = mock_sio["emit"].call_args.args
        # join_room slices user_id[:8] for the broadcast message, so the
        # "Anonymous" fallback also gets truncated to 8 chars.
        assert payload["content"] == "User Anonymou joined the room"


class TestSendDmHandler:
    @pytest.mark.asyncio
    async def test_no_session_is_a_noop(self, mock_sio):
        mock_sio["get_session"].return_value = None

        await sc.send_dm("sid1", {"recipient_id": str(uuid.uuid4()), "content": "hi"})

        mock_sio["emit"].assert_not_awaited()

    @pytest.mark.asyncio
    async def test_rate_limited_emits_error(self, mock_sio, monkeypatch):
        user_id = str(uuid.uuid4())
        mock_sio["get_session"].return_value = {"user_id": user_id}
        monkeypatch.setattr(sc, "check_rate_limit", AsyncMock(return_value=False))

        await sc.send_dm(
            "sid1", {"recipient_id": str(uuid.uuid4()), "content": "hi"}
        )

        mock_sio["emit"].assert_awaited_once_with(
            "error", {"detail": "Rate limit exceeded. Slow down!"}, to="sid1"
        )

    @pytest.mark.asyncio
    async def test_blocked_recipient_emits_error(
        self, mock_sio, db_session: AsyncSession, monkeypatch
    ):
        from app.services.block_service import block_service

        sender = await _make_user(db_session)
        recipient = await _make_user(db_session)
        await block_service.block_user(db_session, sender.id, recipient.id)
        mock_sio["get_session"].return_value = {"user_id": str(sender.id)}
        monkeypatch.setattr(sc, "SessionLocal", lambda: db_session)

        await sc.send_dm(
            "sid1", {"recipient_id": str(recipient.id), "content": "hi"}
        )

        mock_sio["emit"].assert_awaited_once_with(
            "error", {"detail": "Cannot message this user"}, to="sid1"
        )

    @pytest.mark.asyncio
    async def test_success_saves_and_emits_to_both_parties(
        self, mock_sio, db_session: AsyncSession, monkeypatch
    ):
        sender = await _make_user(db_session)
        recipient = await _make_user(db_session)
        mock_sio["get_session"].return_value = {"user_id": str(sender.id)}
        monkeypatch.setattr(sc, "SessionLocal", lambda: db_session)

        await sc.send_dm(
            "sid1", {"recipient_id": str(recipient.id), "content": "hello there"}
        )

        assert mock_sio["emit"].await_count == 2
        rooms_emitted_to = {c.kwargs["room"] for c in mock_sio["emit"].call_args_list}
        assert rooms_emitted_to == {str(sender.id), str(recipient.id)}
        for call in mock_sio["emit"].call_args_list:
            event_name, payload = call.args
            assert event_name == "new_dm"
            assert payload["content"] == "hello there"
            assert payload["sender_id"] == str(sender.id)


class TestSendRoomMessageHandler:
    @pytest.mark.asyncio
    async def test_no_session_is_a_noop(self, mock_sio):
        mock_sio["get_session"].return_value = None

        await sc.send_room_message(
            "sid1", {"room_id": str(uuid.uuid4()), "content": "hi"}
        )

        mock_sio["emit"].assert_not_awaited()

    @pytest.mark.asyncio
    async def test_rate_limited_emits_error(self, mock_sio, monkeypatch):
        mock_sio["get_session"].return_value = {"user_id": str(uuid.uuid4())}
        monkeypatch.setattr(sc, "check_rate_limit", AsyncMock(return_value=False))

        await sc.send_room_message(
            "sid1", {"room_id": str(uuid.uuid4()), "content": "hi"}
        )

        mock_sio["emit"].assert_awaited_once_with(
            "error", {"detail": "Rate limit exceeded. Slow down!"}, to="sid1"
        )

    @pytest.mark.asyncio
    async def test_success_saves_and_emits_to_room(
        self, mock_sio, db_session: AsyncSession, monkeypatch
    ):
        from app.models.chat import ChatRoom

        sender = await _make_user(db_session)
        room = ChatRoom(id=uuid.uuid4(), name=f"room-{uuid.uuid4()}", category="general")
        db_session.add(room)
        await db_session.commit()
        mock_sio["get_session"].return_value = {"user_id": str(sender.id)}
        monkeypatch.setattr(sc, "SessionLocal", lambda: db_session)

        await sc.send_room_message(
            "sid1", {"room_id": str(room.id), "content": "hello room"}
        )

        mock_sio["emit"].assert_awaited_once()
        event_name, payload = mock_sio["emit"].call_args.args
        assert event_name == "new_room_message"
        assert payload["content"] == "hello room"
        assert payload["room_id"] == str(room.id)
        assert mock_sio["emit"].call_args.kwargs["room"] == str(room.id)


class TestJoinForumHandler:
    @pytest.mark.asyncio
    async def test_no_session_is_a_noop(self, mock_sio):
        mock_sio["get_session"].return_value = None

        await sc.join_forum("sid1", {"forum_id": str(uuid.uuid4())})

        mock_sio["enter_room"].assert_not_awaited()
        mock_sio["emit"].assert_not_awaited()

    @pytest.mark.asyncio
    async def test_joins_forum_and_broadcasts_count(self, mock_sio):
        user_id = str(uuid.uuid4())
        forum_id = str(uuid.uuid4())
        mock_sio["get_session"].return_value = {"user_id": user_id}

        await sc.join_forum("sid1", {"forum_id": forum_id})

        mock_sio["enter_room"].assert_awaited_once_with("sid1", f"forum:{forum_id}")
        mock_sio["emit"].assert_awaited_once_with(
            "forum_stats_update",
            {"forum_id": forum_id, "active_users": 1},
            room=f"forum:{forum_id}",
        )


class TestLeaveForumHandler:
    @pytest.mark.asyncio
    async def test_no_session_is_a_noop(self, mock_sio):
        mock_sio["get_session"].return_value = None

        await sc.leave_forum("sid1", {"forum_id": str(uuid.uuid4())})

        mock_sio["leave_room"].assert_not_awaited()
        mock_sio["emit"].assert_not_awaited()

    @pytest.mark.asyncio
    async def test_leaves_forum_and_broadcasts_count(self, mock_sio):
        user_id = str(uuid.uuid4())
        forum_id = str(uuid.uuid4())
        mock_sio["get_session"].return_value = {"user_id": user_id}
        await presence_service.join_forum(uuid.UUID(forum_id), uuid.UUID(user_id))

        await sc.leave_forum("sid1", {"forum_id": forum_id})

        mock_sio["leave_room"].assert_awaited_once_with("sid1", f"forum:{forum_id}")
        mock_sio["emit"].assert_awaited_once_with(
            "forum_stats_update",
            {"forum_id": forum_id, "active_users": 0},
            room=f"forum:{forum_id}",
        )
