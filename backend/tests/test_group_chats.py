import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.chat import GroupChat, GroupMember, GroupMessage
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
        "email": f"group-chat-test-{uuid.uuid4()}@example.com",
        "name": "Group Chat Test User",
        "hashed_password": "x",
        "is_active": True,
    }
    fields.update(overrides)
    user = User(**fields)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _make_group(db: AsyncSession, owner: User, **overrides) -> GroupChat:
    fields = {
        "id": uuid.uuid4(),
        "name": f"Group-{uuid.uuid4()}",
        "owner_id": owner.id,
        "max_members": 50,
    }
    fields.update(overrides)
    group = GroupChat(**fields)
    db.add(group)
    await db.flush()
    db.add(GroupMember(group_id=group.id, user_id=owner.id, role="owner"))
    await db.commit()
    await db.refresh(group)
    return group


async def _add_member(
    db: AsyncSession, group_id: uuid.UUID, user: User, role: str = "member", **overrides
) -> GroupMember:
    fields = {"group_id": group_id, "user_id": user.id, "role": role}
    fields.update(overrides)
    member = GroupMember(**fields)
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


class TestCreateGroup:
    @pytest.mark.asyncio
    async def test_creates_group_with_owner_as_member(
        self, client: AsyncClient, token: str, test_user: User
    ):
        response = await client.post(
            "/api/group-chats",
            json={"name": "My New Group", "max_members": 10},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "My New Group"
        assert data["owner_id"] == str(test_user.id)
        assert data["member_count"] == 1


class TestListMyGroups:
    @pytest.mark.asyncio
    async def test_lists_only_groups_user_belongs_to(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        member_user = await _make_user(db_session)
        other_owner = await _make_user(db_session)
        my_group = await _make_group(db_session, member_user)
        other_group = await _make_group(db_session, other_owner)

        response = await client.get(
            "/api/group-chats", headers=_headers_for(member_user.id)
        )

        assert response.status_code == 200
        ids = {g["id"] for g in response.json()["groups"]}
        assert str(my_group.id) in ids
        assert str(other_group.id) not in ids

    @pytest.mark.asyncio
    async def test_excludes_inactive_groups(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        inactive_group = await _make_group(db_session, user, is_active=False)

        response = await client.get(
            "/api/group-chats", headers=_headers_for(user.id)
        )

        assert response.status_code == 200
        ids = {g["id"] for g in response.json()["groups"]}
        assert str(inactive_group.id) not in ids


class TestGetGroup:
    @pytest.mark.asyncio
    async def test_returns_detail_with_members_and_my_membership(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.get(
            f"/api/group-chats/{group.id}", headers=_headers_for(owner.id)
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["members"]) == 1
        assert data["my_membership"]["role"] == "owner"

    @pytest.mark.asyncio
    async def test_404_for_missing_group(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.get(
            f"/api/group-chats/{uuid.uuid4()}", headers=_headers_for(user.id)
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_403_for_non_member(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        outsider = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.get(
            f"/api/group-chats/{group.id}", headers=_headers_for(outsider.id)
        )

        assert response.status_code == 403


class TestUpdateGroup:
    @pytest.mark.asyncio
    async def test_owner_can_update(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.patch(
            f"/api/group-chats/{group.id}",
            json={"name": "Renamed Group", "max_members": 25},
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Renamed Group"
        assert data["max_members"] == 25

    @pytest.mark.asyncio
    async def test_regular_member_gets_403(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        member = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, member, role="member")

        response = await client.patch(
            f"/api/group-chats/{group.id}",
            json={"name": "Hijacked"},
            headers=_headers_for(member.id),
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_404_for_missing_group(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.patch(
            f"/api/group-chats/{uuid.uuid4()}",
            json={"name": "X"},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 404


class TestDeleteGroup:
    @pytest.mark.asyncio
    async def test_owner_can_delete(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.delete(
            f"/api/group-chats/{group.id}", headers=_headers_for(owner.id)
        )

        assert response.status_code == 204
        await db_session.refresh(group)
        assert group.is_active is False

    @pytest.mark.asyncio
    async def test_admin_non_owner_gets_403(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        admin_member = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, admin_member, role="admin")

        response = await client.delete(
            f"/api/group-chats/{group.id}", headers=_headers_for(admin_member.id)
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_404_for_missing_group(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.delete(
            f"/api/group-chats/{uuid.uuid4()}", headers=_headers_for(user.id)
        )

        assert response.status_code == 404


class TestAddMember:
    @pytest.mark.asyncio
    async def test_owner_adds_member(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        new_user = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.post(
            f"/api/group-chats/{group.id}/members",
            json={"user_id": str(new_user.id)},
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 200
        assert response.json()["role"] == "member"

    @pytest.mark.asyncio
    async def test_regular_member_gets_403(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        member = await _make_user(db_session)
        new_user = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, member, role="member")

        response = await client.post(
            f"/api/group-chats/{group.id}/members",
            json={"user_id": str(new_user.id)},
            headers=_headers_for(member.id),
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_404_when_target_user_missing(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.post(
            f"/api/group-chats/{group.id}/members",
            json={"user_id": str(uuid.uuid4())},
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_400_when_already_a_member(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        member = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, member, role="member")

        response = await client.post(
            f"/api/group-chats/{group.id}/members",
            json={"user_id": str(member.id)},
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_400_when_group_full(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        new_user = await _make_user(db_session)
        group = await _make_group(db_session, owner, max_members=1)

        response = await client.post(
            f"/api/group-chats/{group.id}/members",
            json={"user_id": str(new_user.id)},
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 400


class TestUpdateMember:
    @pytest.mark.asyncio
    async def test_admin_changes_role(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        member = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, member, role="member")

        response = await client.patch(
            f"/api/group-chats/{group.id}/members/{member.id}",
            json={"role": "admin"},
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 200
        assert response.json()["role"] == "admin"

    @pytest.mark.asyncio
    async def test_non_admin_cannot_change_role(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        member_a = await _make_user(db_session)
        member_b = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, member_a, role="member")
        await _add_member(db_session, group.id, member_b, role="member")

        response = await client.patch(
            f"/api/group-chats/{group.id}/members/{member_b.id}",
            json={"role": "admin"},
            headers=_headers_for(member_a.id),
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_cannot_change_owners_role(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        admin_member = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, admin_member, role="admin")

        response = await client.patch(
            f"/api/group-chats/{group.id}/members/{owner.id}",
            json={"role": "admin"},
            headers=_headers_for(admin_member.id),
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_self_updates_own_nickname(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        member = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, member, role="member")

        response = await client.patch(
            f"/api/group-chats/{group.id}/members/{member.id}",
            json={"nickname": "Nicky"},
            headers=_headers_for(member.id),
        )

        assert response.status_code == 200
        assert response.json()["nickname"] == "Nicky"

    @pytest.mark.asyncio
    async def test_self_updates_own_mute_setting(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        member = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, member, role="member")

        response = await client.patch(
            f"/api/group-chats/{group.id}/members/{member.id}",
            json={"is_muted": True},
            headers=_headers_for(member.id),
        )

        assert response.status_code == 200
        assert response.json()["is_muted"] is True

    @pytest.mark.asyncio
    async def test_cannot_update_other_members_nickname(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        member_a = await _make_user(db_session)
        member_b = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, member_a, role="member")
        await _add_member(db_session, group.id, member_b, role="member")

        response = await client.patch(
            f"/api/group-chats/{group.id}/members/{member_b.id}",
            json={"nickname": "Hijacked"},
            headers=_headers_for(member_a.id),
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_404_for_missing_target_member(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        outsider = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.patch(
            f"/api/group-chats/{group.id}/members/{outsider.id}",
            json={"nickname": "X"},
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 404


class TestRemoveMember:
    @pytest.mark.asyncio
    async def test_self_leave(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        member = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, member, role="member")

        response = await client.delete(
            f"/api/group-chats/{group.id}/members/{member.id}",
            headers=_headers_for(member.id),
        )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_admin_removes_other(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        member = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, member, role="member")

        response = await client.delete(
            f"/api/group-chats/{group.id}/members/{member.id}",
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_non_admin_cannot_remove_other(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        member_a = await _make_user(db_session)
        member_b = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, member_a, role="member")
        await _add_member(db_session, group.id, member_b, role="member")

        response = await client.delete(
            f"/api/group-chats/{group.id}/members/{member_b.id}",
            headers=_headers_for(member_a.id),
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_cannot_remove_owner(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.delete(
            f"/api/group-chats/{group.id}/members/{owner.id}",
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_404_for_missing_target_member(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        outsider = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.delete(
            f"/api/group-chats/{group.id}/members/{outsider.id}",
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 404


class TestSendMessage:
    @pytest.mark.asyncio
    async def test_sends_message_and_updates_group_and_membership(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.post(
            f"/api/group-chats/{group.id}/messages",
            json={"content": "hello group"},
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "hello group"
        assert data["sender_id"] == str(owner.id)
        await db_session.refresh(group)
        assert group.last_message_at is not None

    @pytest.mark.asyncio
    async def test_muted_member_gets_403(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        member = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, member, role="member", is_muted=True)

        response = await client.post(
            f"/api/group-chats/{group.id}/messages",
            json={"content": "shh"},
            headers=_headers_for(member.id),
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_reply_to_existing_message_succeeds(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        # Regression guard: `not GroupMessage.is_deleted` used to evaluate to
        # a plain Python False at import time (not a SQL predicate), which
        # and_() then compiled to a literal `WHERE false` - collapsing this
        # lookup so every reply was rejected as "not found" even for a real,
        # non-deleted message in the same group.
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        original = GroupMessage(
            group_id=group.id, sender_id=owner.id, content="original message"
        )
        db_session.add(original)
        await db_session.commit()
        await db_session.refresh(original)

        response = await client.post(
            f"/api/group-chats/{group.id}/messages",
            json={"content": "a reply", "reply_to_id": str(original.id)},
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 200
        assert response.json()["reply_to_id"] == str(original.id)

    @pytest.mark.asyncio
    async def test_reply_to_nonexistent_message_400s(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.post(
            f"/api/group-chats/{group.id}/messages",
            json={"content": "a reply", "reply_to_id": str(uuid.uuid4())},
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_non_member_gets_403(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        outsider = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.post(
            f"/api/group-chats/{group.id}/messages",
            json={"content": "sneaky"},
            headers=_headers_for(outsider.id),
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_404_for_missing_group(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            f"/api/group-chats/{uuid.uuid4()}/messages",
            json={"content": "hi"},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 404


class TestGetMessages:
    @pytest.mark.asyncio
    async def test_returns_messages_in_chronological_order(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        # Regression guard: the same `not GroupMessage.is_deleted` bug (see
        # TestSendMessage.test_reply_to_existing_message_succeeds) made this
        # endpoint's WHERE clause always false too, so it always returned
        # zero messages regardless of how many actually existed.
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        first = GroupMessage(group_id=group.id, sender_id=owner.id, content="first")
        db_session.add(first)
        await db_session.commit()
        second_response = await client.post(
            f"/api/group-chats/{group.id}/messages",
            json={"content": "second"},
            headers=_headers_for(owner.id),
        )
        assert second_response.status_code == 200

        response = await client.get(
            f"/api/group-chats/{group.id}/messages", headers=_headers_for(owner.id)
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert [m["content"] for m in data["messages"]] == ["first", "second"]
        assert data["has_more"] is False

    @pytest.mark.asyncio
    async def test_excludes_deleted_messages(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        db_session.add(
            GroupMessage(
                group_id=group.id,
                sender_id=owner.id,
                content="visible",
            )
        )
        db_session.add(
            GroupMessage(
                group_id=group.id,
                sender_id=owner.id,
                content="[Message deleted]",
                is_deleted=True,
            )
        )
        await db_session.commit()

        response = await client.get(
            f"/api/group-chats/{group.id}/messages", headers=_headers_for(owner.id)
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["messages"][0]["content"] == "visible"

    @pytest.mark.asyncio
    async def test_has_more_true_when_exceeding_limit(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        for i in range(3):
            db_session.add(
                GroupMessage(group_id=group.id, sender_id=owner.id, content=f"msg-{i}")
            )
        await db_session.commit()

        response = await client.get(
            f"/api/group-chats/{group.id}/messages?limit=2",
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["messages"]) == 2
        assert data["has_more"] is True

    @pytest.mark.asyncio
    async def test_before_cursor_excludes_newer_messages(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        older = GroupMessage(group_id=group.id, sender_id=owner.id, content="older")
        db_session.add(older)
        await db_session.commit()
        await db_session.refresh(older)
        newer = GroupMessage(
            group_id=group.id,
            sender_id=owner.id,
            content="newer",
            created_at=older.created_at + timedelta(seconds=1),
        )
        db_session.add(newer)
        await db_session.commit()

        response = await client.get(
            f"/api/group-chats/{group.id}/messages?before={newer.created_at.isoformat()}",
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 200
        contents = [m["content"] for m in response.json()["messages"]]
        assert contents == ["older"]

    @pytest.mark.asyncio
    async def test_non_member_gets_403(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        outsider = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.get(
            f"/api/group-chats/{group.id}/messages", headers=_headers_for(outsider.id)
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_404_for_missing_group(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.get(
            f"/api/group-chats/{uuid.uuid4()}/messages", headers=_headers_for(user.id)
        )

        assert response.status_code == 404


class TestEditMessage:
    @pytest.mark.asyncio
    async def test_sender_can_edit(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        message = GroupMessage(group_id=group.id, sender_id=owner.id, content="typo")
        db_session.add(message)
        await db_session.commit()
        await db_session.refresh(message)

        response = await client.patch(
            f"/api/group-chats/{group.id}/messages/{message.id}",
            json={"content": "fixed"},
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "fixed"
        assert data["is_edited"] is True

    @pytest.mark.asyncio
    async def test_non_sender_gets_403(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        member = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, member, role="member")
        message = GroupMessage(group_id=group.id, sender_id=owner.id, content="mine")
        db_session.add(message)
        await db_session.commit()
        await db_session.refresh(message)

        response = await client.patch(
            f"/api/group-chats/{group.id}/messages/{message.id}",
            json={"content": "hijacked"},
            headers=_headers_for(member.id),
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_cannot_edit_deleted_message(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        message = GroupMessage(
            group_id=group.id,
            sender_id=owner.id,
            content="[Message deleted]",
            is_deleted=True,
        )
        db_session.add(message)
        await db_session.commit()
        await db_session.refresh(message)

        response = await client.patch(
            f"/api/group-chats/{group.id}/messages/{message.id}",
            json={"content": "resurrected"},
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_404_for_missing_message(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.patch(
            f"/api/group-chats/{group.id}/messages/{uuid.uuid4()}",
            json={"content": "x"},
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 404


class TestDeleteMessage:
    @pytest.mark.asyncio
    async def test_sender_can_soft_delete(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        message = GroupMessage(group_id=group.id, sender_id=owner.id, content="oops")
        db_session.add(message)
        await db_session.commit()
        await db_session.refresh(message)

        response = await client.delete(
            f"/api/group-chats/{group.id}/messages/{message.id}",
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 204
        await db_session.refresh(message)
        assert message.is_deleted is True
        assert message.content == "[Message deleted]"

    @pytest.mark.asyncio
    async def test_admin_can_delete_others_message(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        member = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, member, role="member")
        message = GroupMessage(group_id=group.id, sender_id=member.id, content="spam")
        db_session.add(message)
        await db_session.commit()
        await db_session.refresh(message)

        response = await client.delete(
            f"/api/group-chats/{group.id}/messages/{message.id}",
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_non_sender_non_admin_gets_403(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        member_a = await _make_user(db_session)
        member_b = await _make_user(db_session)
        group = await _make_group(db_session, owner)
        await _add_member(db_session, group.id, member_a, role="member")
        await _add_member(db_session, group.id, member_b, role="member")
        message = GroupMessage(group_id=group.id, sender_id=member_a.id, content="mine")
        db_session.add(message)
        await db_session.commit()
        await db_session.refresh(message)

        response = await client.delete(
            f"/api/group-chats/{group.id}/messages/{message.id}",
            headers=_headers_for(member_b.id),
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_404_for_missing_message(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        owner = await _make_user(db_session)
        group = await _make_group(db_session, owner)

        response = await client.delete(
            f"/api/group-chats/{group.id}/messages/{uuid.uuid4()}",
            headers=_headers_for(owner.id),
        )

        assert response.status_code == 404
