import base64
import uuid
from datetime import datetime, timedelta, timezone

import pyotp
import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User
from app.services.totp_service import totp_service


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
        "email": f"totp-test-{uuid.uuid4()}@example.com",
        "name": "TOTP Test User",
        "hashed_password": "x",
        "is_active": True,
    }
    fields.update(overrides)
    user = User(**fields)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


class TestGenerateSecret:
    def test_generates_nonempty_base32_secret(self):
        secret = totp_service.generate_secret()

        assert secret
        assert all(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567" for c in secret)

    def test_secrets_are_unique(self):
        assert totp_service.generate_secret() != totp_service.generate_secret()


class TestGenerateBackupCodes:
    def test_generates_requested_count(self):
        codes = totp_service.generate_backup_codes(5)

        assert len(codes) == 5

    def test_codes_are_unique_uppercase_hex(self):
        codes = totp_service.generate_backup_codes(10)

        assert len(set(codes)) == 10
        for code in codes:
            assert len(code) == 8
            assert code == code.upper()
            int(code, 16)  # raises ValueError if not valid hex


class TestHashBackupCode:
    def test_deterministic(self):
        assert totp_service.hash_backup_code("ABCD1234") == totp_service.hash_backup_code(
            "ABCD1234"
        )

    def test_different_codes_hash_differently(self):
        assert totp_service.hash_backup_code("ABCD1234") != totp_service.hash_backup_code(
            "EFGH5678"
        )

    def test_hash_is_20_hex_chars(self):
        h = totp_service.hash_backup_code("ABCD1234")

        assert len(h) == 20
        int(h, 16)


class TestGetTotpUri:
    def test_uri_contains_issuer_and_email(self):
        secret = totp_service.generate_secret()

        uri = totp_service.get_totp_uri(secret, "user@example.com")

        assert uri.startswith("otpauth://totp/")
        assert "BGCLive" in uri
        assert "user%40example.com" in uri or "user@example.com" in uri


class TestGenerateQrCode:
    def test_returns_valid_base64_png(self):
        secret = totp_service.generate_secret()

        qr_b64 = totp_service.generate_qr_code(secret, "user@example.com")

        png_bytes = base64.b64decode(qr_b64)
        assert png_bytes[:8] == b"\x89PNG\r\n\x1a\n"


class TestVerifyTotp:
    def test_valid_code_verifies(self):
        secret = totp_service.generate_secret()
        code = pyotp.TOTP(secret).now()

        assert totp_service.verify_totp(secret, code) is True

    def test_wrong_code_fails(self):
        secret = totp_service.generate_secret()

        assert totp_service.verify_totp(secret, "000000") is False

    def test_garbage_code_does_not_raise(self):
        secret = totp_service.generate_secret()

        assert totp_service.verify_totp(secret, "not-a-code") is False

    def test_code_within_tolerance_window_verifies(self):
        secret = totp_service.generate_secret()
        totp = pyotp.TOTP(secret)
        earlier = datetime.now(timezone.utc) - timedelta(seconds=30)
        code = totp.at(earlier)

        assert totp_service.verify_totp(secret, code) is True


class TestSetupTotp:
    @pytest.mark.asyncio
    async def test_stores_secret_and_hashed_backup_codes(
        self, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        secret, qr_code, backup_codes = await totp_service.setup_totp(db_session, user)

        assert user.totp_secret == secret
        assert user.totp_enabled is False
        assert len(backup_codes) == totp_service.BACKUP_CODE_COUNT
        expected_hashes = {totp_service.hash_backup_code(c) for c in backup_codes}
        assert set(user.backup_codes) == expected_hashes
        assert qr_code


class TestEnableTotp:
    @pytest.mark.asyncio
    async def test_enables_with_valid_code(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        secret, _, _ = await totp_service.setup_totp(db_session, user)
        code = pyotp.TOTP(secret).now()

        result = await totp_service.enable_totp(db_session, user, code)

        assert result is True
        assert user.totp_enabled is True

    @pytest.mark.asyncio
    async def test_fails_without_setup(self, db_session: AsyncSession):
        user = await _make_user(db_session)

        result = await totp_service.enable_totp(db_session, user, "123456")

        assert result is False

    @pytest.mark.asyncio
    async def test_fails_with_wrong_code(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        await totp_service.setup_totp(db_session, user)

        result = await totp_service.enable_totp(db_session, user, "000000")

        assert result is False
        assert user.totp_enabled is False


class TestDisableTotp:
    @pytest.mark.asyncio
    async def test_disables_with_valid_totp_code(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        secret, _, _ = await totp_service.setup_totp(db_session, user)
        await totp_service.enable_totp(db_session, user, pyotp.TOTP(secret).now())

        result = await totp_service.disable_totp(
            db_session, user, pyotp.TOTP(secret).now()
        )

        assert result is True
        assert user.totp_enabled is False
        assert user.totp_secret is None
        assert user.backup_codes is None

    @pytest.mark.asyncio
    async def test_disables_with_valid_backup_code(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        secret, _, backup_codes = await totp_service.setup_totp(db_session, user)
        await totp_service.enable_totp(db_session, user, pyotp.TOTP(secret).now())

        result = await totp_service.disable_totp(db_session, user, backup_codes[0])

        assert result is True
        assert user.totp_enabled is False

    @pytest.mark.asyncio
    async def test_fails_when_not_enabled(self, db_session: AsyncSession):
        user = await _make_user(db_session)

        result = await totp_service.disable_totp(db_session, user, "123456")

        assert result is False

    @pytest.mark.asyncio
    async def test_fails_with_wrong_code(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        secret, _, _ = await totp_service.setup_totp(db_session, user)
        await totp_service.enable_totp(db_session, user, pyotp.TOTP(secret).now())

        result = await totp_service.disable_totp(db_session, user, "000000")

        assert result is False
        assert user.totp_enabled is True


class TestVerifyBackupCode:
    @pytest.mark.asyncio
    async def test_valid_code_consumes_it(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        _, _, backup_codes = await totp_service.setup_totp(db_session, user)
        code = backup_codes[0]
        code_hash = totp_service.hash_backup_code(code)

        result = await totp_service.verify_backup_code(db_session, user, code)

        assert result is True
        assert code_hash not in user.backup_codes

    @pytest.mark.asyncio
    async def test_code_cannot_be_reused(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        _, _, backup_codes = await totp_service.setup_totp(db_session, user)
        code = backup_codes[0]
        await totp_service.verify_backup_code(db_session, user, code)

        result = await totp_service.verify_backup_code(db_session, user, code)

        assert result is False

    @pytest.mark.asyncio
    async def test_normalizes_lowercase_and_dashes(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        _, _, backup_codes = await totp_service.setup_totp(db_session, user)
        code = backup_codes[0]
        messy = f"{code[:4]}-{code[4:]}".lower()

        result = await totp_service.verify_backup_code(db_session, user, messy)

        assert result is True

    @pytest.mark.asyncio
    async def test_no_backup_codes_returns_false(self, db_session: AsyncSession):
        user = await _make_user(db_session)

        result = await totp_service.verify_backup_code(db_session, user, "ABCD1234")

        assert result is False


class TestRegenerateBackupCodes:
    @pytest.mark.asyncio
    async def test_regenerates_with_valid_code(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        secret, _, old_codes = await totp_service.setup_totp(db_session, user)
        await totp_service.enable_totp(db_session, user, pyotp.TOTP(secret).now())

        new_codes = await totp_service.regenerate_backup_codes(
            db_session, user, pyotp.TOTP(secret).now()
        )

        assert new_codes is not None
        assert len(new_codes) == totp_service.BACKUP_CODE_COUNT
        assert set(new_codes) != set(old_codes)
        old_hash = totp_service.hash_backup_code(old_codes[0])
        assert old_hash not in user.backup_codes

    @pytest.mark.asyncio
    async def test_fails_when_not_enabled(self, db_session: AsyncSession):
        user = await _make_user(db_session)

        result = await totp_service.regenerate_backup_codes(db_session, user, "123456")

        assert result is None

    @pytest.mark.asyncio
    async def test_fails_with_wrong_code(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        secret, _, _ = await totp_service.setup_totp(db_session, user)
        await totp_service.enable_totp(db_session, user, pyotp.TOTP(secret).now())

        result = await totp_service.regenerate_backup_codes(db_session, user, "000000")

        assert result is None


class TestVerify2fa:
    @pytest.mark.asyncio
    async def test_verifies_valid_totp_code(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        secret, _, _ = await totp_service.setup_totp(db_session, user)
        await totp_service.enable_totp(db_session, user, pyotp.TOTP(secret).now())

        assert await totp_service.verify_2fa(db_session, user, pyotp.TOTP(secret).now())

    @pytest.mark.asyncio
    async def test_verifies_valid_backup_code(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        secret, _, backup_codes = await totp_service.setup_totp(db_session, user)
        await totp_service.enable_totp(db_session, user, pyotp.TOTP(secret).now())

        assert await totp_service.verify_2fa(db_session, user, backup_codes[0])

    @pytest.mark.asyncio
    async def test_fails_when_not_enabled(self, db_session: AsyncSession):
        user = await _make_user(db_session)

        assert not await totp_service.verify_2fa(db_session, user, "123456")

    @pytest.mark.asyncio
    async def test_fails_with_wrong_code(self, db_session: AsyncSession):
        user = await _make_user(db_session)
        secret, _, _ = await totp_service.setup_totp(db_session, user)
        await totp_service.enable_totp(db_session, user, pyotp.TOTP(secret).now())

        assert not await totp_service.verify_2fa(db_session, user, "000000")


class TestTotpApi:
    @pytest.mark.asyncio
    async def test_status_disabled_by_default(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.get("/api/2fa/status", headers=_headers_for(user.id))

        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is False
        assert data["backup_codes_remaining"] is None

    @pytest.mark.asyncio
    async def test_setup_returns_secret_and_backup_codes(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post("/api/2fa/setup", headers=_headers_for(user.id))

        assert response.status_code == 200
        data = response.json()
        assert data["secret"]
        assert data["qr_code"]
        assert len(data["backup_codes"]) == totp_service.BACKUP_CODE_COUNT
        assert data["provisioning_uri"].startswith("otpauth://")

    @pytest.mark.asyncio
    async def test_setup_400s_when_already_enabled(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        secret, _, _ = await totp_service.setup_totp(db_session, user)
        await totp_service.enable_totp(db_session, user, pyotp.TOTP(secret).now())

        response = await client.post("/api/2fa/setup", headers=_headers_for(user.id))

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_enable_success_updates_status(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        secret, _, _ = await totp_service.setup_totp(db_session, user)

        response = await client.post(
            "/api/2fa/enable",
            json={"code": pyotp.TOTP(secret).now()},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 200
        status_response = await client.get(
            "/api/2fa/status", headers=_headers_for(user.id)
        )
        data = status_response.json()
        assert data["enabled"] is True
        assert data["backup_codes_remaining"] == totp_service.BACKUP_CODE_COUNT

    @pytest.mark.asyncio
    async def test_enable_400s_without_setup(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            "/api/2fa/enable",
            json={"code": "123456"},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_enable_400s_with_invalid_code(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        await totp_service.setup_totp(db_session, user)

        response = await client.post(
            "/api/2fa/enable",
            json={"code": "000000"},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_enable_400s_when_already_enabled(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        secret, _, _ = await totp_service.setup_totp(db_session, user)
        await totp_service.enable_totp(db_session, user, pyotp.TOTP(secret).now())

        response = await client.post(
            "/api/2fa/enable",
            json={"code": pyotp.TOTP(secret).now()},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_disable_success(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        secret, _, _ = await totp_service.setup_totp(db_session, user)
        await totp_service.enable_totp(db_session, user, pyotp.TOTP(secret).now())

        response = await client.post(
            "/api/2fa/disable",
            json={"code": pyotp.TOTP(secret).now()},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_disable_400s_when_not_enabled(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            "/api/2fa/disable",
            json={"code": "123456"},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_disable_400s_with_invalid_code(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        secret, _, _ = await totp_service.setup_totp(db_session, user)
        await totp_service.enable_totp(db_session, user, pyotp.TOTP(secret).now())

        response = await client.post(
            "/api/2fa/disable",
            json={"code": "000000"},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_regenerate_backup_codes_success(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        secret, _, old_codes = await totp_service.setup_totp(db_session, user)
        await totp_service.enable_totp(db_session, user, pyotp.TOTP(secret).now())

        response = await client.post(
            "/api/2fa/backup-codes/regenerate",
            json={"code": pyotp.TOTP(secret).now()},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 200
        new_codes = response.json()["backup_codes"]
        assert len(new_codes) == totp_service.BACKUP_CODE_COUNT
        assert set(new_codes) != set(old_codes)

    @pytest.mark.asyncio
    async def test_regenerate_400s_when_not_enabled(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)

        response = await client.post(
            "/api/2fa/backup-codes/regenerate",
            json={"code": "123456"},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_regenerate_400s_with_invalid_code(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        secret, _, _ = await totp_service.setup_totp(db_session, user)
        await totp_service.enable_totp(db_session, user, pyotp.TOTP(secret).now())

        response = await client.post(
            "/api/2fa/backup-codes/regenerate",
            json={"code": "000000"},
            headers=_headers_for(user.id),
        )

        assert response.status_code == 400
