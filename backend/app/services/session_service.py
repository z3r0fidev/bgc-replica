import re
import uuid
from datetime import datetime, UTC
from typing import Optional, Tuple

from sqlalchemy import select, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import Session


class SessionService:
    """Service for managing user sessions."""

    @staticmethod
    def parse_user_agent(user_agent: str) -> dict:
        """
        Parse user agent string to extract device info.

        Args:
            user_agent: Raw user agent string

        Returns:
            Dictionary with browser, os, and device type info
        """
        if not user_agent:
            return {}

        device_info = {
            "browser": None,
            "browser_version": None,
            "os": None,
            "os_version": None,
            "device_type": "desktop",
        }

        # Detect browser
        browser_patterns = [
            (r"Chrome/(\d+)", "Chrome"),
            (r"Firefox/(\d+)", "Firefox"),
            (r"Safari/(\d+)", "Safari"),
            (r"Edge/(\d+)", "Edge"),
            (r"MSIE (\d+)", "Internet Explorer"),
            (r"Opera/(\d+)", "Opera"),
        ]

        for pattern, browser_name in browser_patterns:
            match = re.search(pattern, user_agent)
            if match:
                device_info["browser"] = browser_name
                device_info["browser_version"] = match.group(1)
                break

        # Detect OS. Android checked before the bare "Linux" pattern - real
        # Android UAs always include "Linux;" as part of the platform tag
        # (e.g. "Linux; Android 13; Pixel 7"), so Linux would otherwise
        # match first and every Android device would be misreported as OS
        # "Linux" instead of "Android".
        os_patterns = [
            (r"Windows NT (\d+\.\d+)", "Windows"),
            (r"Mac OS X (\d+[._]\d+)", "macOS"),
            (r"Android (\d+)", "Android"),
            (r"Linux", "Linux"),
            (r"iPhone OS (\d+)", "iOS"),
            (r"iPad.*OS (\d+)", "iPadOS"),
        ]

        for pattern, os_name in os_patterns:
            match = re.search(pattern, user_agent)
            if match:
                device_info["os"] = os_name
                if match.lastindex:
                    device_info["os_version"] = match.group(1).replace("_", ".")
                break

        # Detect device type
        if "Mobile" in user_agent or "Android" in user_agent:
            device_info["device_type"] = "mobile"
        elif "iPad" in user_agent or "Tablet" in user_agent:
            device_info["device_type"] = "tablet"

        return device_info

    async def get_user_sessions(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        current_session_token: Optional[str] = None,
    ) -> Tuple[list[dict], int]:
        """
        Get all active sessions for a user.

        Args:
            db: Database session
            user_id: User ID
            current_session_token: Token of the current session (to mark it)

        Returns:
            Tuple of (list of session dicts, total count)
        """
        result = await db.execute(
            select(Session)
            .where(
                and_(
                    Session.user_id == user_id,
                    Session.expires > datetime.now(UTC).replace(tzinfo=None),
                )
            )
            .order_by(Session.last_active.desc().nullslast())
        )
        sessions = result.scalars().all()

        session_list = []
        for session in sessions:
            is_current = (
                current_session_token is not None
                and session.session_token == current_session_token
            )
            session_list.append(
                {
                    "id": session.id,
                    "device_info": session.device_info,
                    "ip_address": session.ip_address,
                    "last_active": session.last_active,
                    "created_at": session.created_at,
                    "expires": session.expires,
                    "is_current": is_current,
                }
            )

        return session_list, len(session_list)

    async def revoke_session(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        session_id: uuid.UUID,
        current_session_token: Optional[str] = None,
    ) -> bool:
        """
        Revoke a specific session.

        Args:
            db: Database session
            user_id: User ID (for verification)
            session_id: Session ID to revoke
            current_session_token: Current session token (prevent self-revocation)

        Returns:
            True if session was revoked, False if not found or is current session
        """
        result = await db.execute(
            select(Session).where(
                and_(
                    Session.id == session_id,
                    Session.user_id == user_id,
                )
            )
        )
        session = result.scalars().first()

        if not session:
            return False

        # Prevent revoking current session
        if current_session_token and session.session_token == current_session_token:
            return False

        await db.delete(session)
        await db.commit()
        return True

    async def revoke_all_sessions(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        current_session_token: Optional[str] = None,
    ) -> int:
        """
        Revoke all sessions for a user except the current one.

        Args:
            db: Database session
            user_id: User ID
            current_session_token: Current session token (to preserve)

        Returns:
            Number of sessions revoked
        """
        # Get count before deletion
        count_result = await db.execute(
            select(Session).where(Session.user_id == user_id)
        )
        all_sessions = count_result.scalars().all()

        # Find current session if token provided
        current_session_id = None
        if current_session_token:
            for session in all_sessions:
                if session.session_token == current_session_token:
                    current_session_id = session.id
                    break

        # Delete all sessions except current
        if current_session_id:
            await db.execute(
                delete(Session).where(
                    and_(
                        Session.user_id == user_id,
                        Session.id != current_session_id,
                    )
                )
            )
            revoked_count = len(all_sessions) - 1
        else:
            await db.execute(delete(Session).where(Session.user_id == user_id))
            revoked_count = len(all_sessions)

        await db.commit()
        return max(0, revoked_count)

    async def update_session_activity(
        self,
        db: AsyncSession,
        session_token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        """
        Update session with latest activity info.

        Args:
            db: Database session
            session_token: Session token
            ip_address: Client IP address
            user_agent: Client user agent
        """
        result = await db.execute(
            select(Session).where(Session.session_token == session_token)
        )
        session = result.scalars().first()

        if session:
            session.last_active = datetime.now(UTC).replace(tzinfo=None)
            if ip_address and not session.ip_address:
                session.ip_address = ip_address
            if user_agent and not session.device_info:
                session.user_agent = user_agent
                session.device_info = self.parse_user_agent(user_agent)
            await db.commit()


session_service = SessionService()
