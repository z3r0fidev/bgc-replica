import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import VerificationToken, User


class VerificationService:
    """Service for managing email verification tokens."""

    @staticmethod
    def generate_token() -> Tuple[str, str]:
        """
        Generate a secure verification token.

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

    async def create_verification_token(self, db: AsyncSession, email: str) -> str:
        """
        Create a new verification token for the given email.
        Deletes any existing tokens for the same email.

        Args:
            db: Database session
            email: Email address to create token for

        Returns:
            Plain token to be sent in email
        """
        # Delete any existing tokens for this email
        await db.execute(
            delete(VerificationToken).where(VerificationToken.identifier == email)
        )

        # Generate new token
        plain_token, hashed_token = self.generate_token()
        expires = datetime.utcnow() + timedelta(
            hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
        )

        # Create new verification token
        verification_token = VerificationToken(
            identifier=email,
            token=hashed_token,
            expires=expires,
        )
        db.add(verification_token)
        await db.commit()

        return plain_token

    async def verify_token(self, db: AsyncSession, plain_token: str) -> Optional[str]:
        """
        Verify a token and return the associated email if valid.

        Args:
            db: Database session
            plain_token: Plain token from verification link

        Returns:
            Email address if token is valid, None otherwise
        """
        hashed_token = self.hash_token(plain_token)

        result = await db.execute(
            select(VerificationToken).where(VerificationToken.token == hashed_token)
        )
        token_record = result.scalars().first()

        if not token_record:
            return None

        # Check expiration
        if token_record.expires < datetime.utcnow():
            # Token expired, delete it
            await db.delete(token_record)
            await db.commit()
            return None

        email = token_record.identifier

        # Delete the token after successful verification
        await db.delete(token_record)
        await db.commit()

        return email

    async def mark_email_verified(self, db: AsyncSession, email: str) -> Optional[User]:
        """
        Mark a user's email as verified.

        Args:
            db: Database session
            email: Email address to mark as verified

        Returns:
            Updated user if found, None otherwise
        """
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()

        if not user:
            return None

        user.email_verified = datetime.utcnow()
        await db.commit()
        await db.refresh(user)

        return user

    async def get_last_verification_sent(
        self, db: AsyncSession, email: str
    ) -> Optional[datetime]:
        """
        Get when the last verification token was created for an email.
        Used for rate limiting resend requests.

        Args:
            db: Database session
            email: Email address to check

        Returns:
            Datetime of last token creation, None if no token exists
        """
        result = await db.execute(
            select(VerificationToken).where(VerificationToken.identifier == email)
        )
        token_record = result.scalars().first()

        if not token_record:
            return None

        # Calculate when token was created based on expiry
        hours = settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
        created_at = token_record.expires - timedelta(hours=hours)
        return created_at


verification_service = VerificationService()
