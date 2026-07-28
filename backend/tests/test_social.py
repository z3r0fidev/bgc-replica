import uuid
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def _make_user(db: AsyncSession, **overrides) -> User:
    fields = {
        "id": uuid.uuid4(),
        "email": f"social-test-{uuid.uuid4()}@example.com",
        "name": "Social Test User",
        "hashed_password": "x",
        "is_active": True,
    }
    fields.update(overrides)
    user = User(**fields)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.mark.asyncio
async def test_add_favorite(client: AsyncClient, token: str, test_target_user: User):
    target_id = str(test_target_user.id)
    response = await client.post(
        f"/api/social/favorite/{target_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["type"] == "FAVORITE"


@pytest.mark.asyncio
async def test_friend_request(client: AsyncClient, token: str, test_target_user: User):
    target_id = str(test_target_user.id)
    with patch("app.api.social.send_friend_request_email_task"):
        response = await client.post(
            f"/api/social/friend-request/{target_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 200
    assert response.json()["status"] == "PENDING"


class TestFriendRequestEmail:
    @pytest.mark.asyncio
    async def test_queues_email_when_recipient_allows_it(
        self, client: AsyncClient, token: str, test_user: User, db_session: AsyncSession
    ):
        recipient = await _make_user(db_session)

        with patch("app.api.social.send_friend_request_email_task") as mock_task:
            response = await client.post(
                f"/api/social/friend-request/{recipient.id}",
                headers={"Authorization": f"Bearer {token}"},
            )

        assert response.status_code == 200
        mock_task.delay.assert_called_once_with(
            to_email=recipient.email,
            sender_name=test_user.name or "Someone",
            to_user_name=recipient.name,
        )

    @pytest.mark.asyncio
    async def test_does_not_queue_email_when_recipient_disabled_it(
        self, client: AsyncClient, token: str, db_session: AsyncSession
    ):
        recipient = await _make_user(
            db_session, notification_preferences={"email_friend_requests": False}
        )

        with patch("app.api.social.send_friend_request_email_task") as mock_task:
            response = await client.post(
                f"/api/social/friend-request/{recipient.id}",
                headers={"Authorization": f"Bearer {token}"},
            )

        assert response.status_code == 200
        mock_task.delay.assert_not_called()
