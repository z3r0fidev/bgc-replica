import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import Profile, User


def _token_for(user_id: uuid.UUID) -> str:
    secret = settings.NEXTAUTH_SECRET or settings.SECRET_KEY
    expire = datetime.now(timezone.utc) + timedelta(minutes=30)
    return jwt.encode(
        {"exp": expire, "sub": str(user_id)},
        secret,
        algorithm=settings.ALGORITHM,
    )


def _headers_for(user_id: uuid.UUID) -> dict:
    return {"Authorization": f"Bearer {_token_for(user_id)}"}


async def _make_user(db: AsyncSession, **overrides) -> User:
    fields = {
        "id": uuid.uuid4(),
        "email": f"verification-api-test-{uuid.uuid4()}@example.com",
        "name": "Verification API Test User",
        "hashed_password": "x",
        "is_active": True,
    }
    fields.update(overrides)
    user = User(**fields)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _make_admin(db: AsyncSession, **overrides) -> User:
    overrides.setdefault("is_superuser", True)
    return await _make_user(db, **overrides)


async def _make_profile(db: AsyncSession, user: User, **overrides) -> Profile:
    fields = {"id": user.id, "display_name": user.name}
    fields.update(overrides)
    profile = Profile(**fields)
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


class TestGetVerificationStatus:
    @pytest.mark.asyncio
    async def test_returns_status_for_verified_profile(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        verified_at = datetime(2026, 1, 1, 12, 0, 0)
        await _make_profile(
            db_session,
            user,
            is_verified=True,
            verified_at=verified_at,
            verification_type="identity",
        )

        response = await client.get(f"/api/verification/{user.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["is_verified"] is True
        assert data["verification_type"] == "identity"
        assert data["verified_at"] is not None

    @pytest.mark.asyncio
    async def test_returns_status_for_unverified_profile(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        await _make_profile(db_session, user)

        response = await client.get(f"/api/verification/{user.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["is_verified"] is False
        assert data["verified_at"] is None
        assert data["verification_type"] is None

    @pytest.mark.asyncio
    async def test_404_for_missing_profile(self, client: AsyncClient):
        response = await client.get(f"/api/verification/{uuid.uuid4()}")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_does_not_require_auth(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        await _make_profile(db_session, user)

        # No Authorization header at all - this endpoint is intentionally
        # public. Regression-guard against an auth dependency sneaking in.
        response = await client.get(f"/api/verification/{user.id}")

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_public_response_omits_verification_notes(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        await _make_profile(
            db_session,
            user,
            is_verified=True,
            verification_type="identity",
            verification_notes="Secret admin-only notes",
        )

        response = await client.get(f"/api/verification/{user.id}")

        assert response.status_code == 200
        assert "verification_notes" not in response.json()


class TestVerifyUser:
    @pytest.mark.asyncio
    async def test_admin_verifies_profile_and_persists_to_db(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_admin(db_session)
        user = await _make_user(db_session)
        await _make_profile(db_session, user)

        response = await client.post(
            f"/api/verification/{user.id}",
            json={
                "verification_type": "celebrity",
                "notes": "Confirmed via ID",
            },
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == str(user.id)
        assert data["is_verified"] is True
        assert data["verified_at"] is not None
        assert data["verification_type"] == "celebrity"
        assert data["verification_notes"] == "Confirmed via ID"

        # Re-query directly to confirm the write was actually persisted,
        # not just reflected in the response body.
        result = await db_session.execute(select(Profile).where(Profile.id == user.id))
        persisted = result.scalars().first()
        assert persisted.is_verified is True
        assert persisted.verified_at is not None
        assert persisted.verification_type == "celebrity"
        assert persisted.verification_notes == "Confirmed via ID"

    @pytest.mark.asyncio
    async def test_rejects_invalid_verification_type_with_422(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        # NOTE: verified experimentally - the require_admin dependency is
        # resolved before body validation for this endpoint's parameter
        # ordering, so an *unauthenticated* request with a bad body 401s
        # rather than 422ing (see test_requires_auth below, which asserts
        # exactly that with a valid body). With valid admin auth, body
        # validation still happens before the path handler body runs, so
        # this 422s even against a user_id with no Profile row at all -
        # i.e. no admin check "passes through" to a DB lookup first.
        admin = await _make_admin(db_session)

        response = await client.post(
            f"/api/verification/{uuid.uuid4()}",
            json={"verification_type": "bogus"},
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_unauthenticated_with_invalid_body_is_401_not_422(
        self, client: AsyncClient
    ):
        # Regression-guard: auth is checked before body validation for this
        # endpoint, so a missing token wins over a malformed body.
        response = await client.post(
            f"/api/verification/{uuid.uuid4()}",
            json={"verification_type": "bogus"},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_404_when_profile_missing(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_admin(db_session)

        response = await client.post(
            f"/api/verification/{uuid.uuid4()}",
            json={"verification_type": "identity"},
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_non_admin_forbidden(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        await _make_profile(db_session, user)

        response = await client.post(
            f"/api/verification/{user.id}",
            json={"verification_type": "identity"},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient, db_session: AsyncSession):
        user = await _make_user(db_session)
        await _make_profile(db_session, user)

        response = await client.post(
            f"/api/verification/{user.id}",
            json={"verification_type": "identity"},
        )

        assert response.status_code == 401


class TestRevokeVerification:
    @pytest.mark.asyncio
    async def test_admin_revokes_profile_and_persists_to_db(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_admin(db_session)
        user = await _make_user(db_session)
        await _make_profile(
            db_session,
            user,
            is_verified=True,
            verified_at=datetime(2026, 1, 1),
            verification_type="official",
            verification_notes="Was verified",
        )

        response = await client.delete(
            f"/api/verification/{user.id}",
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 204
        assert response.content == b""

        result = await db_session.execute(select(Profile).where(Profile.id == user.id))
        persisted = result.scalars().first()
        assert persisted.is_verified is False
        assert persisted.verified_at is None
        assert persisted.verification_type is None
        assert persisted.verification_notes is None

    @pytest.mark.asyncio
    async def test_404_when_profile_missing(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_admin(db_session)

        response = await client.delete(
            f"/api/verification/{uuid.uuid4()}",
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_non_admin_forbidden(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        await _make_profile(db_session, user, is_verified=True)

        response = await client.delete(
            f"/api/verification/{user.id}",
            headers=_headers_for(user.id),
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient, db_session: AsyncSession):
        user = await _make_user(db_session)
        await _make_profile(db_session, user, is_verified=True)

        response = await client.delete(f"/api/verification/{user.id}")

        assert response.status_code == 401


class TestGetVerificationDetails:
    @pytest.mark.asyncio
    async def test_admin_sees_full_details_including_notes(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_admin(db_session)
        user = await _make_user(db_session)
        await _make_profile(
            db_session,
            user,
            is_verified=True,
            verified_at=datetime(2026, 1, 1),
            verification_type="official",
            verification_notes="Admin-only notes here",
        )

        response = await client.get(
            f"/api/verification/{user.id}/details",
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == str(user.id)
        assert data["verification_notes"] == "Admin-only notes here"

    @pytest.mark.asyncio
    async def test_404_when_profile_missing(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        admin = await _make_admin(db_session)

        response = await client.get(
            f"/api/verification/{uuid.uuid4()}/details",
            headers=_headers_for(admin.id),
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_non_admin_forbidden(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        await _make_profile(db_session, user)

        response = await client.get(
            f"/api/verification/{user.id}/details",
            headers=_headers_for(user.id),
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_requires_auth(self, client: AsyncClient, db_session: AsyncSession):
        user = await _make_user(db_session)
        await _make_profile(db_session, user)

        response = await client.get(f"/api/verification/{user.id}/details")

        assert response.status_code == 401
