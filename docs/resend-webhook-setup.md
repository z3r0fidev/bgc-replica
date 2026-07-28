# Resend Webhook Setup Guide

## Overview

`POST /api/webhooks/resend` receives Resend delivery events (bounces, spam complaints, suppression-list changes) so they're recorded in the `email_events` table instead of silently dropped. This document covers registering the endpoint with Resend, which the application code can't do for itself since it requires the deployed backend's public URL.

## Prerequisites

1. Database migrations applied (`alembic upgrade head`) - creates the `email_events` table
2. Backend deployed and reachable at a public HTTPS URL (e.g. `https://api.bgclive.online`)

## Registering the webhook

1. In the [Resend dashboard](https://resend.com/webhooks), create a new webhook (or via the API: `POST https://api.resend.com/webhooks` with `{"endpoint": "https://api.bgclive.online/api/webhooks/resend", "events": ["email.bounced", "email.complained", "suppression.added", "suppression.removed"]}`)
2. Resend generates a signing secret (`whsec_...`) for the new endpoint - copy it
3. Set it in `backend/.env` (or the deployment platform's env vars):
   ```env
   RESEND_WEBHOOK_SECRET=whsec_xxxxx
   ```
4. Restart/redeploy the backend so it picks up the new env var

Until `RESEND_WEBHOOK_SECRET` is set, the endpoint rejects every request with `401 Unauthorized` (fails closed rather than accepting unsigned requests) - this is expected and safe; Resend's dashboard will show delivery failures for the webhook until the secret is configured, at which point they'll start succeeding.

## Verifying it's working

```bash
# Should show the webhook you created, with a recent successful delivery
# once a real bounce/complaint/suppression event has fired.
curl -s https://api.resend.com/webhooks -H "Authorization: Bearer $RESEND_API_KEY"
```

Querying recorded events directly:

```sql
SELECT event_type, recipient_email, created_at FROM email_events ORDER BY created_at DESC LIMIT 20;
```

## Event types persisted

| Event | Recorded when |
|---|---|
| `email.bounced` | Recipient's mail server permanently rejected the email |
| `email.complained` | Delivered successfully, but the recipient marked it as spam |
| `suppression.added` | An address was added to Resend's suppression list (auto after a bounce/complaint, or manual) |
| `suppression.removed` | An address was removed from the suppression list |

Other Resend event types (`email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.delivery_delayed`, `email.failed`, `email.scheduled`, `email.received`) are accepted (return `200`) but not persisted - they're either high-volume and purely informational, or transient/config-error signals rather than the recipient-side delivery problems this endpoint exists to track.
