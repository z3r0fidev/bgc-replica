import io
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.chat import ChatRoom, Message
from app.models.user import User
from app.services.chat import chat_service


async def _make_user(db: AsyncSession, **overrides) -> User:
    user = User(
        id=uuid.uuid4(),
        email=f"chat-test-{uuid.uuid4()}@example.com",
        name="Chat Test User",
        hashed_password="x",
        is_active=True,
        **overrides,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def _token_for(user: User) -> str:
    secret = settings.NEXTAUTH_SECRET or settings.SECRET_KEY
    expire = datetime.now(timezone.utc) + timedelta(minutes=30)
    return jwt.encode(
        {"exp": expire, "sub": str(user.id)}, secret, algorithm=settings.ALGORITHM
    )


def _minimal_png() -> bytes:
    # Smallest possible valid PNG (1x1 transparent pixel) - passes both the
    # magic-byte check and a real PIL open()/EXIF-strip pass, unlike raw
    # magic bytes followed by garbage.
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
        b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )


class TestChatServiceSaveMessage:
    @pytest.mark.asyncio
    async def test_save_message_to_room(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        room = ChatRoom(id=uuid.uuid4(), name=f"room-{uuid.uuid4()}", category="general")
        db_session.add(room)
        await db_session.commit()

        message = await chat_service.save_message(
            db_session, sender_id=user.id, content="hello room", room_id=room.id
        )

        assert message.id is not None
        assert message.content == "hello room"
        assert message.room_id == room.id
        assert message.conversation_id is None
        assert message.sender_id == user.id

    @pytest.mark.asyncio
    async def test_save_message_sanitizes_html(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        room = ChatRoom(id=uuid.uuid4(), name=f"room-{uuid.uuid4()}", category="general")
        db_session.add(room)
        await db_session.commit()

        message = await chat_service.save_message(
            db_session,
            sender_id=user.id,
            content="<script>alert(1)</script>hi",
            room_id=room.id,
        )

        assert "<script>" not in message.content
        assert "hi" in message.content

    @pytest.mark.asyncio
    async def test_save_message_to_conversation_updates_last_message_at(
        self, db_session: AsyncSession
    ):
        user_a = await _make_user(db_session)
        user_b = await _make_user(db_session)
        conv = await chat_service.get_or_create_conversation(
            db_session, user_a.id, user_b.id
        )
        original_last_message_at = conv.last_message_at

        message = await chat_service.save_message(
            db_session,
            sender_id=user_a.id,
            content="hi",
            conversation_id=conv.id,
        )

        await db_session.refresh(conv)
        assert message.conversation_id == conv.id
        assert conv.last_message_at >= original_last_message_at


class TestChatServiceSuggestDynamicRooms:
    @pytest.mark.asyncio
    async def test_no_suggestion_below_threshold(self, monkeypatch):
        async def fake_search(lat, lng, radius_km):
            return [{"id": str(uuid.uuid4())} for _ in range(20)]

        monkeypatch.setattr("app.services.chat.search_users_nearby", fake_search)

        result = await chat_service.suggest_dynamic_rooms(40.0, -73.0)

        assert result == []

    @pytest.mark.asyncio
    async def test_suggests_room_above_threshold(self, monkeypatch):
        async def fake_search(lat, lng, radius_km):
            return [{"id": str(uuid.uuid4())} for _ in range(21)]

        monkeypatch.setattr("app.services.chat.search_users_nearby", fake_search)

        result = await chat_service.suggest_dynamic_rooms(40.0, -73.0)

        assert len(result) == 1
        assert result[0]["reason"] == "High activity detected (21 users nearby)"
        assert result[0]["lat"] == 40.0
        assert result[0]["lng"] == -73.0


class TestChatServiceGetOrCreateConversation:
    @pytest.mark.asyncio
    async def test_creates_new_conversation(self, db_session: AsyncSession):
        user_a = await _make_user(db_session)
        user_b = await _make_user(db_session)

        conv = await chat_service.get_or_create_conversation(
            db_session, user_a.id, user_b.id
        )

        assert conv.id is not None
        assert {conv.user_one_id, conv.user_two_id} == {user_a.id, user_b.id}

    @pytest.mark.asyncio
    async def test_returns_existing_conversation(self, db_session: AsyncSession):
        user_a = await _make_user(db_session)
        user_b = await _make_user(db_session)

        first = await chat_service.get_or_create_conversation(
            db_session, user_a.id, user_b.id
        )
        second = await chat_service.get_or_create_conversation(
            db_session, user_a.id, user_b.id
        )

        assert first.id == second.id

    @pytest.mark.asyncio
    async def test_user_order_does_not_create_duplicate(self, db_session: AsyncSession):
        user_a = await _make_user(db_session)
        user_b = await _make_user(db_session)

        forward = await chat_service.get_or_create_conversation(
            db_session, user_a.id, user_b.id
        )
        reversed_order = await chat_service.get_or_create_conversation(
            db_session, user_b.id, user_a.id
        )

        assert forward.id == reversed_order.id


class TestChatRoomsEndpoint:
    @pytest.mark.asyncio
    async def test_list_rooms(self, client: AsyncClient, db_session: AsyncSession):
        room = ChatRoom(
            id=uuid.uuid4(), name=f"room-{uuid.uuid4()}", category="general"
        )
        db_session.add(room)
        await db_session.commit()

        response = await client.get("/api/chat/rooms")

        assert response.status_code == 200
        data = response.json()
        assert any(r["id"] == str(room.id) for r in data["items"])

    @pytest.mark.asyncio
    async def test_list_rooms_filters_by_category(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        unique_category = f"cat-{uuid.uuid4()}"
        room = ChatRoom(
            id=uuid.uuid4(), name=f"room-{uuid.uuid4()}", category=unique_category
        )
        db_session.add(room)
        await db_session.commit()

        response = await client.get(f"/api/chat/rooms?category={unique_category}")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["id"] == str(room.id)


class TestChatRoomHistoryEndpoint:
    @pytest.mark.asyncio
    async def test_returns_messages_for_room(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        room = ChatRoom(id=uuid.uuid4(), name=f"room-{uuid.uuid4()}", category="general")
        db_session.add(room)
        await db_session.commit()

        await chat_service.save_message(
            db_session, sender_id=user.id, content="first", room_id=room.id
        )

        response = await client.get(f"/api/chat/rooms/{room.id}/history")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["content"] == "first"

    @pytest.mark.asyncio
    async def test_room_history_spans_partition_boundaries(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """The Message model gained a composite (id, created_at) primary key
        when messages was partitioned (issue #66) - this exercises the real
        API endpoint against messages landing in genuinely different
        partitions (this month's, via the fixture-created current-month
        partition, and messages_default for a far-future date), not just
        the lower-level partition mechanics test_partition_automation.py
        already covers."""
        user = await _make_user(db_session)
        room = ChatRoom(id=uuid.uuid4(), name=f"room-{uuid.uuid4()}", category="general")
        db_session.add(room)
        await db_session.commit()

        db_session.add(
            Message(
                id=uuid.uuid4(),
                room_id=room.id,
                sender_id=user.id,
                content="current month",
                created_at=datetime.utcnow(),
            )
        )
        db_session.add(
            Message(
                id=uuid.uuid4(),
                room_id=room.id,
                sender_id=user.id,
                content="far future, lands in default partition",
                created_at=datetime(2099, 1, 1),
            )
        )
        await db_session.commit()

        response = await client.get(f"/api/chat/rooms/{room.id}/history?limit=10")

        assert response.status_code == 200
        contents = {item["content"] for item in response.json()["items"]}
        assert contents == {"current month", "far future, lands in default partition"}


class TestConversationsEndpoint:
    @pytest.mark.asyncio
    async def test_list_conversations_for_current_user(
        self, client: AsyncClient, token: str, test_user: User, db_session: AsyncSession
    ):
        other = await _make_user(db_session)
        conv = await chat_service.get_or_create_conversation(
            db_session, test_user.id, other.id
        )

        response = await client.get(
            "/api/chat/conversations", headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        ids = {c["id"] for c in response.json()["items"]}
        assert str(conv.id) in ids

    @pytest.mark.asyncio
    async def test_create_conversation(
        self, client: AsyncClient, token: str, db_session: AsyncSession
    ):
        recipient = await _make_user(db_session)

        response = await client.post(
            f"/api/chat/conversations?recipient_id={recipient.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert recipient.id in (uuid.UUID(data["user_one_id"]), uuid.UUID(data["user_two_id"]))

    @pytest.mark.asyncio
    async def test_create_conversation_with_blocked_user_is_forbidden(
        self, client: AsyncClient, token: str, test_user: User, db_session: AsyncSession
    ):
        from app.services.block_service import block_service

        blocked = await _make_user(db_session)
        await block_service.block_user(db_session, test_user.id, blocked.id)

        response = await client.post(
            f"/api/chat/conversations?recipient_id={blocked.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403


class TestConversationHistoryEndpoint:
    @pytest.mark.asyncio
    async def test_returns_messages_for_participant(
        self, client: AsyncClient, token: str, test_user: User, db_session: AsyncSession
    ):
        other = await _make_user(db_session)
        conv = await chat_service.get_or_create_conversation(
            db_session, test_user.id, other.id
        )
        await chat_service.save_message(
            db_session, sender_id=test_user.id, content="hi there", conversation_id=conv.id
        )

        response = await client.get(
            f"/api/chat/conversations/{conv.id}/history",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["items"][0]["content"] == "hi there"

    @pytest.mark.asyncio
    async def test_non_participant_gets_404(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user_a = await _make_user(db_session)
        user_b = await _make_user(db_session)
        outsider = await _make_user(db_session)
        conv = await chat_service.get_or_create_conversation(
            db_session, user_a.id, user_b.id
        )

        response = await client.get(
            f"/api/chat/conversations/{conv.id}/history",
            headers={"Authorization": f"Bearer {_token_for(outsider)}"},
        )

        assert response.status_code == 404


class TestChatMediaUploadEndpoint:
    @pytest.mark.asyncio
    async def test_upload_valid_image_succeeds(self, client: AsyncClient, token: str):
        files = {"file": ("test.png", io.BytesIO(_minimal_png()), "image/png")}

        response = await client.post(
            "/api/chat/media",
            files=files,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert "url" in response.json()

    @pytest.mark.asyncio
    async def test_upload_rejects_content_not_matching_claimed_type(
        self, client: AsyncClient, token: str
    ):
        files = {
            "file": ("fake.png", io.BytesIO(b"not actually a png"), "image/png")
        }

        response = await client.post(
            "/api/chat/media",
            files=files,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
