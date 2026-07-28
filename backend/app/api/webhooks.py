import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from svix.webhooks import Webhook, WebhookVerificationError

from app.core.config import settings
from app.core.database import get_db
from app.models.email_event import EmailEvent

router = APIRouter()

# Only events actionable enough to be worth persisting - not the high-volume,
# purely-informational ones (sent/delivered/opened/clicked). "failed" and
# "delivery_delayed" are transient/config-error signals rather than the
# recipient-side bounce/complaint/suppression events this endpoint exists for.
_PERSISTED_EVENT_TYPES = {
    "email.bounced",
    "email.complained",
    "suppression.added",
    "suppression.removed",
}


def _extract_recipient_and_source_id(event_type: str, data: dict) -> tuple[str | None, str | None]:
    """
    Resend's webhook payload shape differs by event family: email.* events
    carry `to` (a list) and `email_id`; suppression.* events carry a single
    `email` string and `source_id` (the email that triggered the
    suppression, if any - null for manual suppression-list entries).
    """
    if event_type.startswith("suppression."):
        return data.get("email"), data.get("source_id")

    to = data.get("to") or []
    recipient = to[0] if to else None
    return recipient, data.get("email_id")


@router.post("/resend", status_code=status.HTTP_200_OK)
async def resend_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Receive Resend delivery events (bounces, spam complaints, suppression-list
    changes) so they're recorded instead of silently dropped. Verifies the
    request is genuinely from Resend via its Svix-based webhook signature -
    see https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests.
    """
    if not settings.RESEND_WEBHOOK_SECRET:
        # Not configured yet (e.g. before the endpoint is registered in the
        # Resend dashboard and its secret copied here) - fail closed with the
        # same response as a bad signature, rather than a distinct status
        # that would (a) leak internal configuration state to callers and
        # (b) read as a genuine server error to automated API monitoring.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )

    body = await request.body()

    try:
        payload = Webhook(settings.RESEND_WEBHOOK_SECRET).verify(body, dict(request.headers))
    except WebhookVerificationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )

    event_type = payload.get("type")
    if event_type in _PERSISTED_EVENT_TYPES:
        data = payload.get("data") or {}
        recipient_email, resend_email_id = _extract_recipient_and_source_id(event_type, data)

        if recipient_email:
            db.add(
                EmailEvent(
                    id=uuid.uuid4(),
                    resend_email_id=resend_email_id,
                    event_type=event_type,
                    recipient_email=recipient_email,
                    payload=payload,
                )
            )
            await db.commit()

    return {"received": True}
