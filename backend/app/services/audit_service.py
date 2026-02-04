import uuid
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import AuthLog


class AuditAction:
    """Constants for audit log actions."""

    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGIN_2FA_REQUIRED = "login_2fa_required"
    LOGIN_2FA_SUCCESS = "login_2fa_success"
    LOGIN_2FA_FAILED = "login_2fa_failed"
    LOGOUT = "logout"
    REGISTER = "register"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET_REQUEST = "password_reset_request"
    PASSWORD_RESET_COMPLETE = "password_reset_complete"
    EMAIL_VERIFIED = "email_verified"
    TOTP_ENABLED = "totp_enabled"
    TOTP_DISABLED = "totp_disabled"
    BACKUP_CODES_REGENERATED = "backup_codes_regenerated"
    SESSION_REVOKED = "session_revoked"
    ALL_SESSIONS_REVOKED = "all_sessions_revoked"


class AuditService:
    """Service for recording and querying authentication audit logs."""

    async def log(
        self,
        db: AsyncSession,
        action: str,
        user_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        event_metadata: Optional[dict] = None,
    ) -> AuthLog:
        """
        Record an audit log entry.

        Args:
            db: Database session
            action: Action type (use AuditAction constants)
            user_id: User ID (if known)
            ip_address: Client IP address
            user_agent: Client user agent
            success: Whether the action succeeded
            event_metadata: Additional context data

        Returns:
            Created AuthLog entry
        """
        log_entry = AuthLog(
            user_id=user_id,
            action=action,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            event_metadata=event_metadata,
        )
        db.add(log_entry)
        await db.commit()
        await db.refresh(log_entry)
        return log_entry

    async def get_user_logs(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
        action: Optional[str] = None,
    ) -> tuple[List[AuthLog], int]:
        """
        Get audit logs for a specific user.

        Args:
            db: Database session
            user_id: User ID
            limit: Max records to return
            offset: Records to skip
            action: Filter by action type

        Returns:
            Tuple of (logs list, total count)
        """
        conditions = [AuthLog.user_id == user_id]
        if action:
            conditions.append(AuthLog.action == action)

        # Get total count
        count_result = await db.execute(
            select(func.count(AuthLog.id)).where(and_(*conditions))
        )
        total = count_result.scalar() or 0

        # Get logs
        result = await db.execute(
            select(AuthLog)
            .where(and_(*conditions))
            .order_by(AuthLog.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        logs = list(result.scalars().all())

        return logs, total

    async def get_recent_failed_logins(
        self,
        db: AsyncSession,
        user_id: Optional[uuid.UUID] = None,
        email: Optional[str] = None,
        ip_address: Optional[str] = None,
        minutes: int = 15,
    ) -> int:
        """
        Count recent failed login attempts.

        Used for brute force protection.

        Args:
            db: Database session
            user_id: User ID (if known)
            email: Email address (stored in metadata)
            ip_address: IP address
            minutes: Time window in minutes

        Returns:
            Number of failed login attempts
        """
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)

        conditions = [
            AuthLog.action == AuditAction.LOGIN_FAILED,
            AuthLog.created_at >= cutoff,
        ]

        if user_id:
            conditions.append(AuthLog.user_id == user_id)
        if ip_address:
            conditions.append(AuthLog.ip_address == ip_address)

        result = await db.execute(
            select(func.count(AuthLog.id)).where(and_(*conditions))
        )
        return result.scalar() or 0

    async def get_login_history(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        limit: int = 10,
    ) -> List[dict]:
        """
        Get recent login history for a user.

        Args:
            db: Database session
            user_id: User ID
            limit: Max records to return

        Returns:
            List of login events with details
        """
        result = await db.execute(
            select(AuthLog)
            .where(
                and_(
                    AuthLog.user_id == user_id,
                    AuthLog.action.in_(
                        [
                            AuditAction.LOGIN_SUCCESS,
                            AuditAction.LOGIN_2FA_SUCCESS,
                        ]
                    ),
                )
            )
            .order_by(AuthLog.created_at.desc())
            .limit(limit)
        )
        logs = result.scalars().all()

        return [
            {
                "id": str(log.id),
                "action": log.action,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at.isoformat(),
                "event_metadata": log.event_metadata,
            }
            for log in logs
        ]

    async def get_security_events(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        limit: int = 20,
    ) -> List[dict]:
        """
        Get security-related events for a user.

        Includes password changes, 2FA changes, session revocations.

        Args:
            db: Database session
            user_id: User ID
            limit: Max records to return

        Returns:
            List of security events
        """
        security_actions = [
            AuditAction.PASSWORD_CHANGE,
            AuditAction.PASSWORD_RESET_COMPLETE,
            AuditAction.TOTP_ENABLED,
            AuditAction.TOTP_DISABLED,
            AuditAction.BACKUP_CODES_REGENERATED,
            AuditAction.SESSION_REVOKED,
            AuditAction.ALL_SESSIONS_REVOKED,
        ]

        result = await db.execute(
            select(AuthLog)
            .where(
                and_(
                    AuthLog.user_id == user_id,
                    AuthLog.action.in_(security_actions),
                )
            )
            .order_by(AuthLog.created_at.desc())
            .limit(limit)
        )
        logs = result.scalars().all()

        return [
            {
                "id": str(log.id),
                "action": log.action,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat(),
                "success": log.success,
            }
            for log in logs
        ]


audit_service = AuditService()
