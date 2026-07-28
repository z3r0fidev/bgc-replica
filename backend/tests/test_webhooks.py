import json
import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from svix.webhooks import Webhook

from app.core.config import settings
from app.models.email_event import EmailEvent

TEST_SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"


def _signed_request(payload: dict, secret: str = TEST_SECRET) -> tuple[bytes, dict]:
    body = json.dumps(payload).encode()
    msg_id = f"msg_{uuid.uuid4().hex}"
    timestamp = datetime.now(timezone.utc)
    signature = Webhook(secret).sign(msg_id=msg_id, timestamp=timestamp, data=body.decode())

    headers = {
        "svix-id": msg_id,
        "svix-timestamp": str(int(timestamp.timestamp())),
        "svix-signature": signature,
        "content-type": "application/json",
    }
    return body, headers


@pytest.fixture(autouse=True)
def _configure_webhook_secret(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_WEBHOOK_SECRET", TEST_SECRET)


class TestResendWebhook:
    @pytest.mark.asyncio
    async def test_bounced_event_is_persisted(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        payload = {
            "type": "email.bounced",
            "created_at": "2026-11-22T23:41:12.126Z",
            "data": {
                "email_id": "56761188-7520-42d8-8898-ff6fc54ce618",
                "from": "Acme <onboarding@resend.dev>",
                "to": ["bounced-recipient@example.com"],
                "subject": "Sending this example",
                "bounce": {"type": "Permanent", "subType": "Suppressed"},
            },
        }
        body, headers = _signed_request(payload)

        response = await client.post("/api/webhooks/resend", content=body, headers=headers)

        assert response.status_code == 200
        result = await db_session.execute(
            select(EmailEvent).where(EmailEvent.recipient_email == "bounced-recipient@example.com")
        )
        event = result.scalars().first()
        assert event is not None
        assert event.event_type == "email.bounced"
        assert event.resend_email_id == "56761188-7520-42d8-8898-ff6fc54ce618"
        assert event.payload["data"]["bounce"]["type"] == "Permanent"

    @pytest.mark.asyncio
    async def test_complained_event_is_persisted(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        payload = {
            "type": "email.complained",
            "data": {
                "email_id": str(uuid.uuid4()),
                "to": ["complainer@example.com"],
            },
        }
        body, headers = _signed_request(payload)

        response = await client.post("/api/webhooks/resend", content=body, headers=headers)

        assert response.status_code == 200
        result = await db_session.execute(
            select(EmailEvent).where(EmailEvent.recipient_email == "complainer@example.com")
        )
        assert result.scalars().first() is not None

    @pytest.mark.asyncio
    async def test_suppression_added_event_is_persisted(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        payload = {
            "type": "suppression.added",
            "data": {
                "id": str(uuid.uuid4()),
                "email": "suppressed@example.com",
                "origin": "bounce",
                "source_id": "some-email-id",
            },
        }
        body, headers = _signed_request(payload)

        response = await client.post("/api/webhooks/resend", content=body, headers=headers)

        assert response.status_code == 200
        result = await db_session.execute(
            select(EmailEvent).where(EmailEvent.recipient_email == "suppressed@example.com")
        )
        event = result.scalars().first()
        assert event is not None
        assert event.resend_email_id == "some-email-id"

    @pytest.mark.asyncio
    async def test_uninteresting_event_type_is_not_persisted(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        payload = {
            "type": "email.delivered",
            "data": {"email_id": str(uuid.uuid4()), "to": ["happy-path@example.com"]},
        }
        body, headers = _signed_request(payload)

        response = await client.post("/api/webhooks/resend", content=body, headers=headers)

        assert response.status_code == 200
        result = await db_session.execute(
            select(EmailEvent).where(EmailEvent.recipient_email == "happy-path@example.com")
        )
        assert result.scalars().first() is None

    @pytest.mark.asyncio
    async def test_invalid_signature_is_rejected(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        payload = {"type": "email.bounced", "data": {"to": ["victim@example.com"]}}
        body, headers = _signed_request(payload, secret="whsec_" + "a" * 32)

        response = await client.post("/api/webhooks/resend", content=body, headers=headers)

        assert response.status_code == 401
        result = await db_session.execute(
            select(EmailEvent).where(EmailEvent.recipient_email == "victim@example.com")
        )
        assert result.scalars().first() is None

    @pytest.mark.asyncio
    async def test_missing_signature_headers_is_rejected(self, client: AsyncClient):
        response = await client.post(
            "/api/webhooks/resend",
            content=json.dumps({"type": "email.bounced", "data": {}}).encode(),
            headers={"content-type": "application/json"},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_no_secret_configured_returns_401(
        self, client: AsyncClient, monkeypatch
    ):
        monkeypatch.setattr(settings, "RESEND_WEBHOOK_SECRET", "")
        body, headers = _signed_request({"type": "email.bounced", "data": {}})

        response = await client.post("/api/webhooks/resend", content=body, headers=headers)

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_bounce_with_no_recipient_is_not_persisted(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        # "to" present but empty - shouldn't crash, just skip persisting.
        payload = {"type": "email.bounced", "data": {"email_id": str(uuid.uuid4()), "to": []}}
        body, headers = _signed_request(payload)

        response = await client.post("/api/webhooks/resend", content=body, headers=headers)

        assert response.status_code == 200
        result = await db_session.execute(select(EmailEvent))
        assert result.scalars().first() is None
