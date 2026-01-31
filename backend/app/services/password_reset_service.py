import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import VerificationToken, User


class PasswordResetService:
    """Service for managing password reset tokens."""

    # Use a prefix to distinguish from email verification tokens
    TOKEN_PREFIX = "pwd_reset_"

    @staticmethod
    def generate_token() -> Tuple[str, str]:
        """
        Generate a secure password reset token.

        Returns:
            Tuple of (plain_token, hashed_token)
        """
        plain_token = secrets.token_urlsafe(32)
        hashed_token = hashlib.sha256(plain_token.encode()).hexdigest()
        return plain_token, hashed_token

    @staticmethod
    def hash_token(plain_token: str) -> str:
        """Hash a plain token for comparison."""
        return hashlib.sha256(plain_token.encode()).hexdigest()

    async def create_reset_token(self, db: AsyncSession, email: str) -> str:
        """
        Create a new password reset token for the given email.
        Deletes any existing reset tokens for the same email.

        Args:
            db: Database session
            email: Email address to create token for

        Returns:
            Plain token to be sent in email
        """
        # Use prefixed identifier to distinguish from verification tokens
        identifier = f"{self.TOKEN_PREFIX}{email}"

        # Delete any existing reset tokens for this email
        await db.execute(
            delete(VerificationToken).where(
                VerificationToken.identifier == identifier
            )
        )

        # Generate new token
        plain_token, hashed_token = self.generate_token()
        expires = datetime.utcnow() + timedelta(
            hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS
        )

        # Create new reset token
        reset_token = VerificationToken(
            identifier=identifier,
            token=hashed_token,
            expires=expires,
        )
        db.add(reset_token)
        await db.commit()

        return plain_token

    async def verify_reset_token(
        self, db: AsyncSession, plain_token: str
    ) -> Optional[str]:
        """
        Verify a reset token and return the associated email if valid.

        Args:
            db: Database session
            plain_token: Plain token from reset link

        Returns:
            Email address if token is valid, None otherwise
        """
        hashed_token = self.hash_token(plain_token)

        result = await db.execute(
            select(VerificationToken).where(
                VerificationToken.token == hashed_token
            )
        )
        token_record = result.scalars().first()

        if not token_record:
            return None

        # Verify it's a password reset token
        if not token_record.identifier.startswith(self.TOKEN_PREFIX):
            return None

        # Check expiration
        if token_record.expires < datetime.utcnow():
            await db.delete(token_record)
            await db.commit()
            return None

        # Extract email from identifier
        email = token_record.identifier[len(self.TOKEN_PREFIX):]

        # Delete the token after successful verification
        await db.delete(token_record)
        await db.commit()

        return email

    async def reset_password(
        self, db: AsyncSession, email: str, new_password: str
    ) -> Optional[User]:
        """
        Reset a user's password.

        Args:
            db: Database session
            email: Email address of user
            new_password: New password to set

        Returns:
            Updated user if found, None otherwise
        """
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()

        if not user:
            return None

        user.hashed_password = get_password_hash(new_password)
        await db.commit()
        await db.refresh(user)

        return user

    async def get_last_reset_request(
        self, db: AsyncSession, email: str
    ) -> Optional[datetime]:
        """
        Get when the last reset token was created for an email.
        Used for rate limiting.

        Args:
            db: Database session
            email: Email address to check

        Returns:
            Datetime of last token creation, None if no token exists
        """
        identifier = f"{self.TOKEN_PREFIX}{email}"

        result = await db.execute(
            select(VerificationToken).where(
                VerificationToken.identifier == identifier
            )
        )
        token_record = result.scalars().first()

        if not token_record:
            return None

        # Calculate when token was created based on expiry
        hours = settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS
        created_at = token_record.expires - timedelta(hours=hours)
        return created_at


password_reset_service = PasswordResetService()
