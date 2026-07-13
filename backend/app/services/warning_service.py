import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.models.user import User, AdminActionLog
from app.models.moderation import Warning
from app.services.tasks import send_warning_email_task


class WarningService:
    async def issue_warning(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        admin_id: Optional[uuid.UUID],
        reason: str,
        severity: str = "STANDARD",
        notify: bool = True,
        report_id: Optional[uuid.UUID] = None,
    ) -> tuple[Warning, bool]:
        """
        Create a warning for a user, check escalation, and dispatch the
        notification email. Returns (warning, escalated).
        """
        warning = Warning(
            user_id=user_id,
            admin_id=admin_id,
            report_id=report_id,
            reason=reason,
            severity=severity,
        )
        db.add(warning)
        await db.flush()

        result = await db.execute(
            select(func.count(Warning.id)).where(
                Warning.user_id == user_id, Warning.status == "ACTIVE"
            )
        )
        active_count = result.scalar_one()
        threshold = settings.WARNING_ESCALATION_THRESHOLD
        escalated = active_count >= threshold

        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalars().first()

        if escalated:
            warning.triggered_escalation = True

            if user and not user.banned_at:
                now = datetime.utcnow()
                user.suspended_at = now
                user.suspension_reason = (
                    f"Automatic suspension: reached {threshold} active warnings"
                )
                new_suspended_until = now + timedelta(
                    hours=settings.WARNING_ESCALATION_SUSPEND_HOURS
                )
                # Don't shorten an existing longer suspension (e.g. double-fire race)
                if (
                    not user.suspended_until
                    or user.suspended_until < new_suspended_until
                ):
                    user.suspended_until = new_suspended_until

            db.add(
                AdminActionLog(
                    admin_id=admin_id,
                    target_user_id=user_id,
                    action="AUTO_SUSPEND_ESCALATION",
                    reason=f"Reached {threshold} active warnings",
                    action_metadata={"warning_id": str(warning.id)},
                )
            )

        db.add(
            AdminActionLog(
                admin_id=admin_id,
                target_user_id=user_id,
                action="WARN_USER",
                reason=reason,
                action_metadata={
                    "warning_id": str(warning.id),
                    "report_id": str(report_id) if report_id else None,
                },
            )
        )

        await db.commit()
        await db.refresh(warning)

        if notify:
            if user and user.email:
                send_warning_email_task.delay(
                    to_email=user.email,
                    reason=reason,
                    warning_count=active_count,
                    threshold=threshold,
                    escalated=escalated,
                    user_name=user.name,
                )

        return warning, escalated


warning_service = WarningService()
