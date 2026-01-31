import base64
import io
import secrets
from typing import List, Optional, Tuple

import pyotp
import qrcode
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class TOTPService:
    """Service for managing TOTP two-factor authentication."""

    BACKUP_CODE_COUNT = 10
    BACKUP_CODE_LENGTH = 8
    ISSUER_NAME = "BGCLive"

    @staticmethod
    def generate_secret() -> str:
        """Generate a new TOTP secret."""
        return pyotp.random_base32()

    @staticmethod
    def generate_backup_codes(count: int = 10) -> List[str]:
        """Generate a list of backup codes."""
        codes = []
        for _ in range(count):
            # Generate 8-character alphanumeric codes
            code = secrets.token_hex(4).upper()  # 8 hex characters
            codes.append(code)
        return codes

    @staticmethod
    def hash_backup_code(code: str) -> str:
        """Hash a backup code for storage."""
        import hashlib
        return hashlib.sha256(code.encode()).hexdigest()[:20]

    def get_totp_uri(self, secret: str, email: str) -> str:
        """Generate TOTP provisioning URI for QR code."""
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=email, issuer_name=self.ISSUER_NAME)

    def generate_qr_code(self, secret: str, email: str) -> str:
        """
        Generate a QR code as base64 encoded PNG.

        Args:
            secret: TOTP secret
            email: User email for provisioning URI

        Returns:
            Base64 encoded PNG image
        """
        uri = self.get_totp_uri(secret, email)

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(uri)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)

        return base64.b64encode(buffer.getvalue()).decode()

    @staticmethod
    def verify_totp(secret: str, code: str) -> bool:
        """
        Verify a TOTP code.

        Args:
            secret: User's TOTP secret
            code: Code to verify

        Returns:
            True if code is valid
        """
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)  # Allow 1 window tolerance

    async def setup_totp(
        self, db: AsyncSession, user: User
    ) -> Tuple[str, str, List[str]]:
        """
        Initialize TOTP setup for a user.

        Args:
            db: Database session
            user: User to set up TOTP for

        Returns:
            Tuple of (secret, qr_code_base64, backup_codes)
        """
        secret = self.generate_secret()
        qr_code = self.generate_qr_code(secret, user.email)
        backup_codes = self.generate_backup_codes(self.BACKUP_CODE_COUNT)

        # Store secret temporarily (not enabled yet)
        user.totp_secret = secret
        # Store hashed backup codes
        user.backup_codes = [self.hash_backup_code(c) for c in backup_codes]

        await db.commit()
        await db.refresh(user)

        return secret, qr_code, backup_codes

    async def enable_totp(
        self, db: AsyncSession, user: User, code: str
    ) -> bool:
        """
        Enable TOTP after verifying the code.

        Args:
            db: Database session
            user: User to enable TOTP for
            code: TOTP code to verify

        Returns:
            True if enabled successfully
        """
        if not user.totp_secret:
            return False

        if not self.verify_totp(user.totp_secret, code):
            return False

        user.totp_enabled = True
        await db.commit()
        await db.refresh(user)

        return True

    async def disable_totp(
        self, db: AsyncSession, user: User, code: str
    ) -> bool:
        """
        Disable TOTP for a user.

        Args:
            db: Database session
            user: User to disable TOTP for
            code: TOTP code or backup code to verify

        Returns:
            True if disabled successfully
        """
        if not user.totp_enabled or not user.totp_secret:
            return False

        # Try TOTP code first
        if self.verify_totp(user.totp_secret, code):
            user.totp_enabled = False
            user.totp_secret = None
            user.backup_codes = None
            await db.commit()
            await db.refresh(user)
            return True

        # Try backup code
        if await self.verify_backup_code(db, user, code):
            user.totp_enabled = False
            user.totp_secret = None
            user.backup_codes = None
            await db.commit()
            await db.refresh(user)
            return True

        return False

    async def verify_backup_code(
        self, db: AsyncSession, user: User, code: str
    ) -> bool:
        """
        Verify and consume a backup code.

        Args:
            db: Database session
            user: User to verify backup code for
            code: Backup code to verify

        Returns:
            True if code is valid
        """
        if not user.backup_codes:
            return False

        code_hash = self.hash_backup_code(code.upper().replace("-", ""))

        if code_hash in user.backup_codes:
            # Remove used backup code
            user.backup_codes = [c for c in user.backup_codes if c != code_hash]
            await db.commit()
            await db.refresh(user)
            return True

        return False

    async def regenerate_backup_codes(
        self, db: AsyncSession, user: User, code: str
    ) -> Optional[List[str]]:
        """
        Regenerate backup codes after verifying TOTP.

        Args:
            db: Database session
            user: User to regenerate codes for
            code: TOTP code to verify

        Returns:
            New backup codes if successful, None otherwise
        """
        if not user.totp_enabled or not user.totp_secret:
            return None

        if not self.verify_totp(user.totp_secret, code):
            return None

        backup_codes = self.generate_backup_codes(self.BACKUP_CODE_COUNT)
        user.backup_codes = [self.hash_backup_code(c) for c in backup_codes]

        await db.commit()
        await db.refresh(user)

        return backup_codes

    async def verify_2fa(
        self, db: AsyncSession, user: User, code: str
    ) -> bool:
        """
        Verify 2FA code (TOTP or backup code) for login.

        Args:
            db: Database session
            user: User to verify 2FA for
            code: TOTP code or backup code

        Returns:
            True if verified
        """
        if not user.totp_enabled or not user.totp_secret:
            return False

        # Try TOTP first
        if self.verify_totp(user.totp_secret, code):
            return True

        # Try backup code
        return await self.verify_backup_code(db, user, code)


totp_service = TOTPService()
