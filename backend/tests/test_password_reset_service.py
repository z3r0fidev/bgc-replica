import uuid
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.models.user import User, VerificationToken
from app.services.password_reset_service import password_reset_service


async def _make_user(db: AsyncSession, **overrides) -> User:
    fields = {
        "id": uuid.uuid4(),
        "email": f"pwd-reset-test-{uuid.uuid4()}@example.com",
        "name": "Password Reset Test User",
        "hashed_password": get_password_hash("OldPassword1"),
        "is_active": True,
    }
    fields.update(overrides)
    user = User(**fields)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


class TestGenerateToken:
    def test_hashed_token_matches_hash_of_plain(self):
        plain, hashed = password_reset_service.generate_token()

        assert password_reset_service.hash_token(plain) == hashed

    def test_tokens_are_unique(self):
        plain1, _ = password_reset_service.generate_token()
        plain2, _ = password_reset_service.generate_token()

        assert plain1 != plain2


class TestHashToken:
    def test_deterministic(self):
        assert password_reset_service.hash_token("abc") == password_reset_service.hash_token(
            "abc"
        )

    def test_different_input_different_hash(self):
        assert password_reset_service.hash_token("abc") != password_reset_service.hash_token(
            "xyz"
        )


class TestCreateResetToken:
    @pytest.mark.asyncio
    async def test_creates_token_row_with_correct_identifier(
        self, db_session: AsyncSession
    ):
        email = f"create-{uuid.uuid4()}@example.com"

        plain_token = await password_reset_service.create_reset_token(db_session, email)

        result = await db_session.execute(
            select(VerificationToken).where(
                VerificationToken.identifier == f"pwd_reset_{email}"
            )
        )
        record = result.scalars().first()
        assert record is not None
        assert record.token == password_reset_service.hash_token(plain_token)

    @pytest.mark.asyncio
    async def test_replaces_existing_token_for_same_email(
        self, db_session: AsyncSession
    ):
        email = f"replace-{uuid.uuid4()}@example.com"
        first_token = await password_reset_service.create_reset_token(db_session, email)
        second_token = await password_reset_service.create_reset_token(db_session, email)

        assert first_token != second_token
        # The first token must no longer verify - it was deleted.
        assert await password_reset_service.verify_reset_token(
            db_session, first_token
        ) is None

    @pytest.mark.asyncio
    async def test_does_not_affect_other_emails_token(self, db_session: AsyncSession):
        email_a = f"a-{uuid.uuid4()}@example.com"
        email_b = f"b-{uuid.uuid4()}@example.com"
        token_a = await password_reset_service.create_reset_token(db_session, email_a)
        await password_reset_service.create_reset_token(db_session, email_b)

        result = await db_session.execute(
            select(VerificationToken).where(
                VerificationToken.token == password_reset_service.hash_token(token_a)
            )
        )
        assert result.scalars().first() is not None


class TestVerifyResetToken:
    @pytest.mark.asyncio
    async def test_valid_token_returns_email_and_is_single_use(
        self, db_session: AsyncSession
    ):
        email = f"verify-{uuid.uuid4()}@example.com"
        token = await password_reset_service.create_reset_token(db_session, email)

        result = await password_reset_service.verify_reset_token(db_session, token)
        assert result == email

        # Token was deleted after use - a second attempt must fail.
        second_result = await password_reset_service.verify_reset_token(
            db_session, token
        )
        assert second_result is None

    @pytest.mark.asyncio
    async def test_unknown_token_returns_none(self, db_session: AsyncSession):
        result = await password_reset_service.verify_reset_token(
            db_session, "not-a-real-token"
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_expired_token_returns_none_and_is_deleted(
        self, db_session: AsyncSession
    ):
        email = f"expired-{uuid.uuid4()}@example.com"
        plain, hashed = password_reset_service.generate_token()
        expired_record = VerificationToken(
            identifier=f"pwd_reset_{email}",
            token=hashed,
            expires=datetime.utcnow() - timedelta(hours=1),
        )
        db_session.add(expired_record)
        await db_session.commit()

        result = await password_reset_service.verify_reset_token(db_session, plain)

        assert result is None
        check = await db_session.execute(
            select(VerificationToken).where(VerificationToken.token == hashed)
        )
        assert check.scalars().first() is None

    @pytest.mark.asyncio
    async def test_wrong_token_type_is_rejected(self, db_session: AsyncSession):
        # A token that exists but was created for a different purpose (e.g.
        # email verification, identified without the pwd_reset_ prefix)
        # must not be accepted as a password reset token.
        plain, hashed = password_reset_service.generate_token()
        other_record = VerificationToken(
            identifier="some-other-user@example.com",
            token=hashed,
            expires=datetime.utcnow() + timedelta(hours=1),
        )
        db_session.add(other_record)
        await db_session.commit()

        result = await password_reset_service.verify_reset_token(db_session, plain)

        assert result is None


class TestResetPassword:
    @pytest.mark.asyncio
    async def test_updates_password_for_existing_user(self, db_session: AsyncSession):
        user = await _make_user(db_session)

        updated = await password_reset_service.reset_password(
            db_session, user.email, "NewPassword1"
        )

        assert updated is not None
        assert verify_password("NewPassword1", updated.hashed_password)
        assert not verify_password("OldPassword1", updated.hashed_password)

    @pytest.mark.asyncio
    async def test_returns_none_for_unknown_email(self, db_session: AsyncSession):
        result = await password_reset_service.reset_password(
            db_session, "no-such-user@example.com", "NewPassword1"
        )

        assert result is None


class TestGetLastResetRequest:
    @pytest.mark.asyncio
    async def test_returns_none_when_no_token_exists(self, db_session: AsyncSession):
        result = await password_reset_service.get_last_reset_request(
            db_session, f"none-{uuid.uuid4()}@example.com"
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_returns_created_time_derived_from_expiry(
        self, db_session: AsyncSession
    ):
        email = f"last-request-{uuid.uuid4()}@example.com"
        before = datetime.utcnow()
        await password_reset_service.create_reset_token(db_session, email)

        last_request = await password_reset_service.get_last_reset_request(
            db_session, email
        )

        assert last_request is not None
        assert abs((last_request - before).total_seconds()) < 5


class TestPasswordResetApi:
    @pytest.mark.asyncio
    async def test_forgot_password_unknown_email_still_returns_success(
        self, client: AsyncClient
    ):
        response = await client.post(
            "/api/auth/forgot-password",
            json={"email": f"unknown-{uuid.uuid4()}@example.com"},
        )

        assert response.status_code == 200
        assert response.json()["success"] is True

    @pytest.mark.asyncio
    async def test_forgot_password_oauth_only_user_creates_no_token(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session, hashed_password=None)

        response = await client.post(
            "/api/auth/forgot-password", json={"email": user.email}
        )

        assert response.status_code == 200
        last_request = await password_reset_service.get_last_reset_request(
            db_session, user.email
        )
        assert last_request is None

    @pytest.mark.asyncio
    async def test_forgot_password_creates_token_for_real_user(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            "/api/auth/forgot-password", json={"email": user.email}
        )

        assert response.status_code == 200
        last_request = await password_reset_service.get_last_reset_request(
            db_session, user.email
        )
        assert last_request is not None

    @pytest.mark.asyncio
    async def test_forgot_password_rate_limited_on_second_request(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        first = await client.post(
            "/api/auth/forgot-password", json={"email": user.email}
        )
        assert first.status_code == 200

        second = await client.post(
            "/api/auth/forgot-password", json={"email": user.email}
        )

        assert second.status_code == 429

    @pytest.mark.asyncio
    async def test_reset_password_success(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        token = await password_reset_service.create_reset_token(db_session, user.email)

        response = await client.post(
            "/api/auth/reset-password",
            json={"token": token, "new_password": "BrandNew1"},
        )

        assert response.status_code == 200
        await db_session.refresh(user)
        assert verify_password("BrandNew1", user.hashed_password)

    @pytest.mark.asyncio
    async def test_reset_password_invalid_token_400s(self, client: AsyncClient):
        response = await client.post(
            "/api/auth/reset-password",
            json={"token": "garbage-token", "new_password": "BrandNew1"},
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_reset_password_404s_when_user_deleted_after_token_issued(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        token = await password_reset_service.create_reset_token(db_session, user.email)
        await db_session.delete(user)
        await db_session.commit()

        response = await client.post(
            "/api/auth/reset-password",
            json={"token": token, "new_password": "BrandNew1"},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_reset_password_weak_password_422s(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        token = await password_reset_service.create_reset_token(db_session, user.email)

        response = await client.post(
            "/api/auth/reset-password",
            json={"token": token, "new_password": "weak"},
        )

        assert response.status_code == 422
