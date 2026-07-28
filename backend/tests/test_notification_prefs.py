import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.notification_prefs import should_send_email


async def _make_user(db: AsyncSession, **overrides) -> User:
    fields = {
        "id": uuid.uuid4(),
        "email": f"prefs-test-{uuid.uuid4()}@example.com",
        "name": "Prefs Test User",
        "hashed_password": "x",
        "is_active": True,
    }
    fields.update(overrides)
    user = User(**fields)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


class TestShouldSendEmail:
    @pytest.mark.asyncio
    async def test_defaults_to_true_for_messages_when_unset(self, db_session: AsyncSession):
        user = await _make_user(db_session)

        assert should_send_email(user, "email_messages") is True

    @pytest.mark.asyncio
    async def test_defaults_to_false_for_profile_views_when_unset(
        self, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        assert should_send_email(user, "email_profile_views") is False

    @pytest.mark.asyncio
    async def test_respects_explicit_false_override(self, db_session: AsyncSession):
        user = await _make_user(
            db_session, notification_preferences={"email_messages": False}
        )

        assert should_send_email(user, "email_messages") is False

    @pytest.mark.asyncio
    async def test_digest_never_suppresses_all_email_regardless_of_flag(
        self, db_session: AsyncSession
    ):
        user = await _make_user(
            db_session,
            notification_preferences={
                "email_messages": True,
                "email_digest_frequency": "never",
            },
        )

        assert should_send_email(user, "email_messages") is False

    @pytest.mark.asyncio
    async def test_no_email_on_file_returns_false(self, db_session: AsyncSession):
        user = await _make_user(db_session, email=None)

        assert should_send_email(user, "email_messages") is False

    @pytest.mark.asyncio
    async def test_unknown_preference_key_defaults_true(self, db_session: AsyncSession):
        user = await _make_user(db_session)

        assert should_send_email(user, "email_something_not_in_the_schema") is True
