import uuid
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, VerificationToken
from app.services.verification_service import verification_service


async def _make_user(db: AsyncSession, **overrides) -> User:
    fields = {
        "id": uuid.uuid4(),
        "email": f"verify-test-{uuid.uuid4()}@example.com",
        "name": "Verification Test User",
        "hashed_password": "x",
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
        plain, hashed = verification_service.generate_token()

        assert verification_service.hash_token(plain) == hashed

    def test_tokens_are_unique(self):
        plain1, _ = verification_service.generate_token()
        plain2, _ = verification_service.generate_token()

        assert plain1 != plain2


class TestHashToken:
    def test_deterministic(self):
        assert verification_service.hash_token("abc") == verification_service.hash_token(
            "abc"
        )

    def test_different_input_different_hash(self):
        assert verification_service.hash_token("abc") != verification_service.hash_token(
            "xyz"
        )


class TestCreateVerificationToken:
    @pytest.mark.asyncio
    async def test_creates_token_row_for_email(self, db_session: AsyncSession):
        email = f"create-{uuid.uuid4()}@example.com"

        plain_token = await verification_service.create_verification_token(
            db_session, email
        )

        result = await db_session.execute(
            select(VerificationToken).where(VerificationToken.identifier == email)
        )
        record = result.scalars().first()
        assert record is not None
        assert record.token == verification_service.hash_token(plain_token)

    @pytest.mark.asyncio
    async def test_replaces_existing_token_for_same_email(
        self, db_session: AsyncSession
    ):
        email = f"replace-{uuid.uuid4()}@example.com"
        first_token = await verification_service.create_verification_token(
            db_session, email
        )
        second_token = await verification_service.create_verification_token(
            db_session, email
        )

        assert first_token != second_token
        assert await verification_service.verify_token(db_session, first_token) is None

    @pytest.mark.asyncio
    async def test_does_not_affect_other_emails_token(self, db_session: AsyncSession):
        email_a = f"a-{uuid.uuid4()}@example.com"
        email_b = f"b-{uuid.uuid4()}@example.com"
        token_a = await verification_service.create_verification_token(
            db_session, email_a
        )
        await verification_service.create_verification_token(db_session, email_b)

        result = await db_session.execute(
            select(VerificationToken).where(
                VerificationToken.token == verification_service.hash_token(token_a)
            )
        )
        assert result.scalars().first() is not None


class TestVerifyToken:
    @pytest.mark.asyncio
    async def test_valid_token_returns_email_and_is_single_use(
        self, db_session: AsyncSession
    ):
        email = f"verify-{uuid.uuid4()}@example.com"
        token = await verification_service.create_verification_token(db_session, email)

        result = await verification_service.verify_token(db_session, token)
        assert result == email

        second_result = await verification_service.verify_token(db_session, token)
        assert second_result is None

    @pytest.mark.asyncio
    async def test_unknown_token_returns_none(self, db_session: AsyncSession):
        result = await verification_service.verify_token(db_session, "not-a-real-token")

        assert result is None

    @pytest.mark.asyncio
    async def test_expired_token_returns_none_and_is_deleted(
        self, db_session: AsyncSession
    ):
        email = f"expired-{uuid.uuid4()}@example.com"
        plain, hashed = verification_service.generate_token()
        expired_record = VerificationToken(
            identifier=email,
            token=hashed,
            expires=datetime.utcnow() - timedelta(hours=1),
        )
        db_session.add(expired_record)
        await db_session.commit()

        result = await verification_service.verify_token(db_session, plain)

        assert result is None
        check = await db_session.execute(
            select(VerificationToken).where(VerificationToken.token == hashed)
        )
        assert check.scalars().first() is None


class TestMarkEmailVerified:
    @pytest.mark.asyncio
    async def test_marks_existing_user_verified(self, db_session: AsyncSession):
        user = await _make_user(db_session, email_verified=None)

        updated = await verification_service.mark_email_verified(db_session, user.email)

        assert updated is not None
        assert updated.email_verified is not None

    @pytest.mark.asyncio
    async def test_returns_none_for_unknown_email(self, db_session: AsyncSession):
        result = await verification_service.mark_email_verified(
            db_session, "no-such-user@example.com"
        )

        assert result is None


class TestGetLastVerificationSent:
    @pytest.mark.asyncio
    async def test_returns_none_when_no_token_exists(self, db_session: AsyncSession):
        result = await verification_service.get_last_verification_sent(
            db_session, f"none-{uuid.uuid4()}@example.com"
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_returns_created_time_derived_from_expiry(
        self, db_session: AsyncSession
    ):
        email = f"last-sent-{uuid.uuid4()}@example.com"
        before = datetime.utcnow()
        await verification_service.create_verification_token(db_session, email)

        last_sent = await verification_service.get_last_verification_sent(
            db_session, email
        )

        assert last_sent is not None
        assert abs((last_sent - before).total_seconds()) < 5


class TestVerificationApi:
    @pytest.mark.asyncio
    async def test_register_creates_verification_token(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        email = f"register-{uuid.uuid4()}@example.com"

        response = await client.post(
            "/api/auth/register",
            json={
                "email": email,
                "username": f"user{uuid.uuid4().hex[:12]}",
                "name": "New User",
                "password": "StrongPass123!",
            },
        )

        assert response.status_code == 200
        last_sent = await verification_service.get_last_verification_sent(
            db_session, email
        )
        assert last_sent is not None

    @pytest.mark.asyncio
    async def test_verify_email_success(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session, email_verified=None)
        token = await verification_service.create_verification_token(
            db_session, user.email
        )

        response = await client.post("/api/auth/verify-email", json={"token": token})

        assert response.status_code == 200
        await db_session.refresh(user)
        assert user.email_verified is not None

    @pytest.mark.asyncio
    async def test_verify_email_invalid_token_400s(self, client: AsyncClient):
        response = await client.post(
            "/api/auth/verify-email", json={"token": "garbage-token"}
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_verify_email_404s_when_user_deleted_after_token_issued(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        token = await verification_service.create_verification_token(
            db_session, user.email
        )
        await db_session.delete(user)
        await db_session.commit()

        response = await client.post("/api/auth/verify-email", json={"token": token})

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_resend_verification_unknown_email_still_returns_success(
        self, client: AsyncClient
    ):
        response = await client.post(
            "/api/auth/resend-verification",
            json={"email": f"unknown-{uuid.uuid4()}@example.com"},
        )

        assert response.status_code == 200
        assert response.json()["success"] is True

    @pytest.mark.asyncio
    async def test_resend_verification_already_verified_creates_no_token(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session, email_verified=datetime.utcnow())

        response = await client.post(
            "/api/auth/resend-verification", json={"email": user.email}
        )

        assert response.status_code == 200
        assert "already verified" in response.json()["message"].lower()
        last_sent = await verification_service.get_last_verification_sent(
            db_session, user.email
        )
        assert last_sent is None

    @pytest.mark.asyncio
    async def test_resend_verification_creates_token_for_unverified_user(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session, email_verified=None)

        response = await client.post(
            "/api/auth/resend-verification", json={"email": user.email}
        )

        assert response.status_code == 200
        last_sent = await verification_service.get_last_verification_sent(
            db_session, user.email
        )
        assert last_sent is not None

    @pytest.mark.asyncio
    async def test_resend_verification_rate_limited_on_second_request(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session, email_verified=None)
        first = await client.post(
            "/api/auth/resend-verification", json={"email": user.email}
        )
        assert first.status_code == 200

        second = await client.post(
            "/api/auth/resend-verification", json={"email": user.email}
        )

        assert second.status_code == 429
