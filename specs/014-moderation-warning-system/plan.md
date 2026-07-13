# Moderation Warning System (Issue #65)

## Context

Moderators can already resolve a content report with a `"warn_user"` action from `admin/moderation/page.tsx`, but the backend branch that handles it (`backend/app/api/moderation.py:345`) is a stub — `# TODO: Implement warning system (email notification, etc.)`. There's no persistence, no email, no history, and no escalation. Issue #65 asks for all of that: a real `Warning` record, a Resend email to the warned user, per-user warning history visible to admins, and automatic escalation to a suspension after a configurable number of warnings (default 3).

This is the first of four open issues, chosen to go first because it's the only one with a real UI surface — good fit for bringing in UX/UI design passes before writing backend code. Three research passes (technical architecture, UX flow, visual design) were run in parallel and are reconciled below into one plan with consistent naming.

## Data Model

**New table `user_warnings`, not piggybacked on `admin_action_logs`.** Escalation needs a fast "count active warnings for user X" query and future room for expiry/severity — awkward to get from a generic denormalized audit table. We still write a parallel `admin_action_logs` row (`action="WARN_USER"`) on every issuance purely so the existing generic Action History feed keeps showing warnings too, but `user_warnings` is the source of truth for counts and escalation.

New file `backend/app/models/moderation.py`:

```python
class Warning(Base):
    __tablename__ = "user_warnings"

    id: UUID pk default=uuid4
    user_id: UUID FK users.id ondelete="CASCADE", index=True
    admin_id: Optional[UUID] FK users.id ondelete="SET NULL", index=True   # matches AdminActionLog.admin_id naming
    report_id: Optional[UUID] FK content_reports.id ondelete="SET NULL", index=True  # null = issued directly from user detail page, not null = issued via resolve_report
    reason: str String(500)
    severity: str String(50), default="STANDARD"   # moderator-set category (LOW/STANDARD/SEVERE), informational only in v1 — does NOT weight escalation counting (see Escalation Logic)
    status: str String(50), default="ACTIVE", index=True   # ACTIVE / EXPIRED / REVOKED — plain string per this codebase's convention (no sa.Enum anywhere in the model layer)
    triggered_escalation: bool default=False
    action_metadata: Optional[dict] JSONB
    created_at: DateTime default=utcnow, index=True
    updated_at: DateTime default=utcnow, onupdate=utcnow
```

Composite indexes: `(user_id, created_at)` for history listing, `(user_id, status)` for the active-count query.

**Do not add `warning_count` to `User`.** Compute it on read (`COUNT(*) WHERE user_id=? AND status='ACTIVE'`) rather than maintaining a denormalized counter — avoids sync bugs and a backfill entirely (no `users` table migration needed at all). `source` ("report" vs "manual") is derived from `report_id IS NOT NULL` at serialization time, not stored.

Migration: `backend/alembic/versions/h2i3j4k5l6m7_add_user_warnings.py`, `down_revision = "g1h2i3j4k5l6"` (current head). Follow `backend/alembic/versions/c3d4e5f6a7b8_add_admin_action_logs.py` exactly for style (`postgresql.UUID`/`postgresql.JSONB`, explicit `op.create_index` calls, `downgrade()` drops indexes then table).

## Backend API

New Pydantic schemas in `backend/app/schemas/admin.py` (same file that owns `SuspendUserRequest`/`AdminActionLogItem` — this is the same "admin acting on a user" family):

- `IssueWarningRequest(SafeBaseModel)`: `reason: str = Field(..., min_length=10, max_length=500)` (raised from the 5-char minimum used for suspend/ban, since this text is emailed to the user), `severity: str = Field("STANDARD")`, `notify: bool = Field(True)` (lets a moderator log a silent warning without emailing).
- `WarningItem(BaseModel, from_attributes=True)`: `id, user_id, admin_id, admin_name, report_id, reason, severity, status, triggered_escalation, created_at`.
- `WarningListResponse`: `items: List[WarningItem], total, active_count, threshold, limit, offset` — `active_count`/`threshold` included directly so the frontend escalation meter never needs a second round trip.
- `RevokeWarningRequest(SafeBaseModel)`: `reason: str = Field(..., min_length=5, max_length=500)`.

New endpoints in `backend/app/api/admin.py`, next to `suspend`/`ban`/`restore`, using this file's stronger existing pattern (`deps.get_admin_user`, `fastapi_limiter` rate limiting, `log_admin_action`) rather than `moderation.py`'s older local `require_admin()`:

- `POST /api/admin/users/{user_id}/warnings` — issue directly from the user detail page. `Rate(10, Duration.MINUTE)`, same as `suspend`/`ban`. Returns `{warning: WarningItem, escalated: bool, active_count: int}`.
- `GET /api/admin/users/{user_id}/warnings` — paginated history (`status`, `limit`, `offset` params, mirrors `get_action_logs`). Returns `WarningListResponse`.
- `POST /api/admin/users/{user_id}/warnings/{warning_id}/revoke` — sets `status="REVOKED"`, writes `log_admin_action(..., "REVOKE_WARNING", ...)`. Never deletes the row (audit integrity), never retroactively lifts an already-fired suspension — the UI must say so explicitly (see UX section).

**Shared issuance logic**: new `backend/app/services/warning_service.py`, singleton `warning_service` (mirrors `moderation_service`'s pattern), one function `issue_warning(db, user_id, admin_id, reason, severity="STANDARD", notify=True, report_id=None) -> (Warning, escalated: bool)`. Both the new `POST .../warnings` endpoint and `moderation.py`'s `resolve_report` `warn_user` branch call this same function. Update the stub:

```python
elif action == "warn_user":
    report.status = "RESOLVED"
    target_user_id = await _resolve_report_target_user_id(db, report)
    if target_user_id:
        await warning_service.issue_warning(
            db, user_id=target_user_id, admin_id=current_user.id,
            reason=report.reason, report_id=report.id,
        )
```

`_resolve_report_target_user_id` is new — needed because non-`USER` reports (`THREAD`/`POST`/`STATUS`) currently have no way to resolve "who gets warned"; look up `author_id` on the relevant content model by `content_id`. (Note: `ban_user`'s branch in the same file has an equivalent pre-existing gap — out of scope to fix here, but worth a one-line callout in the PR description so it doesn't look like an accidental inconsistency.)

## Escalation Logic

Inside `issue_warning()`, after committing the new row: `COUNT(*) WHERE user_id=? AND status='ACTIVE'`. Escalation is a **simple count of active warnings, not severity-weighted** — `severity` is informational only in v1 (weighting is a reasonable future enhancement, not in issue #65's acceptance criteria). If `active_count >= settings.WARNING_ESCALATION_THRESHOLD`, set `triggered_escalation=True` on this warning and set the same suspension fields `suspend_user` already sets directly (`user.suspended_at`, `user.suspension_reason`, `user.suspended_until = now + timedelta(hours=settings.WARNING_ESCALATION_SUSPEND_HOURS)`) — a few lines of duplication with `admin.py:suspend_user`, not worth extracting into a shared helper for four field assignments. Write a second `log_admin_action(db, admin_id=None, target_user_id, "AUTO_SUSPEND_ESCALATION", ...)` entry distinct from the warning's own log entry, so "an admin chose to suspend" stays visually distinguishable from "the threshold fired it" in Action History.

New `Settings` fields in `backend/app/core/config.py` (env-configurable, matching how `RESEND_API_KEY` etc. are already treated — an ops-tunable value, not a code constant like `ModerationService.REPORT_THRESHOLD`):

```python
WARNING_ESCALATION_THRESHOLD: int = 3
WARNING_ESCALATION_SUSPEND_HOURS: int = 168  # 7 days
```

Known low-severity gap, not fixed here: `bulk-resolve` has no rate limit today (pre-existing), so bulk-warning via that path bypasses the 10/min limit on the direct endpoint. Not worth adding limiting inside `issue_warning()` itself for this pass — flag it, don't fix it.

## Email Flow

`backend/app/services/email_service.py`: add `send_warning_email(to_email, reason, warning_count, threshold, escalated, user_name=None) -> bool`, copying `send_verification_email`'s exact shape (raw f-string HTML + text fallback, early-return `False` if no `RESEND_API_KEY`, try/except around `resend.Emails.send(...)`). Content: reason, "warning N of threshold", and if `escalated` (or `warning_count >= threshold - 1`) a plain-language explanation of what happens next — reuse the one method with the `escalated` flag branching subject/heading rather than a separate `send_suspension_email` method (single-flag difference doesn't justify duplicating the whole HTML boilerplate). Appeal instructions: a static line pointing at `settings.APP_URL`/support contact — there's no appeals workflow in this codebase, and building one is out of scope for #65.

`backend/app/services/tasks.py`: add `send_warning_email_task`, same shape as `send_verification_email_task` (`run_async()` wrapper, lazy `email_service` import). `issue_warning()` calls `.delay(...)` fire-and-forget — email failures must never block warning issuance or the HTTP response.

## Frontend

**Types** (`frontend/src/types/admin.ts`), naming matches the backend schemas 1:1: `WarningItem`, `WarningListResponse`, `IssueWarningRequest`, `RevokeWarningRequest`, `IssueWarningResponse`.

**Service** (`frontend/src/services/adminService.ts`, bearer-token + `Sentry.startSpan` pattern — not `moderationService.ts`'s cookie pattern): `getUserWarnings(userId, params)`, `issueWarning(userId, data)`, `revokeWarning(userId, warningId, data)`.

**`admin/users/[id]/page.tsx`** — extend `ActionType` (currently `"suspend" | "ban" | "restore" | "make-admin" | "revoke-admin"`) with `"warn"`. Add an `Issue Warning` button (`text-yellow-600`, `AlertTriangle` icon) to the existing action-button column, reusing the existing single `Dialog`/`actionType` state machine — add a `warn` branch to the title/description switch and the form-body conditional exactly like the existing `suspend`/`ban` branches. Textarea validation bumps to `reason.length < 10` for this branch (see Data Model). Add a new "Warning History" card, structurally a sibling of the existing "Action History" card (same `bg-muted/50 rounded-lg` row idiom), fetched alongside `getUser`/`getActionLogs` in the existing `fetchData()` `Promise.all`.

**New component `WarningEscalationMeter`** (sm/md/lg size variants) — a horizontal segmented step-bar (rounded rectangles, not circles — deliberately distinct from `MilestoneTracker`'s achievement-framed circle/icon grammar, since "filled = bad" here). Each segment colored by its position in the severity ramp:

| Position | Classes |
|---|---|
| 1st warning | `bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400` (soft tint) |
| 2nd warning | `bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400` (soft tint — orange deliberately matches this codebase's existing "Suspended" status badge color, foreshadowing the outcome) |
| 3rd/threshold | `Badge variant="destructive"` (solid token, matching "Banned") |

The soft-tint → solid-token break at the threshold mirrors this codebase's existing convention: soft tints mean "a tracked category," solid/token fills mean "authoritative current account state." At `count === 0`, render nothing (not an empty gray bar — reads as broken, not clean).

- **sm** (moderation queue row): just the numeric `Badge` + `Tooltip`, no bar — too small a footprint to read at list density. Only shown when the reported user has ≥1 active warning.
- **md** (profile card passive badge): compact badge+tooltip, e.g. "⚠ 2/3".
- **lg** (warn dialog + Warning History card header): full segmented bar + microcopy line color-matched to current level ("2 of 3 warnings on record. 1 more will trigger automatic suspension.").

**New component `WarningHistoryList`** — rows in the same `bg-muted/50 rounded-lg p-3` family as Action History, differentiated with `border-l-4 border-{level-color}-500/60` (colored by that warning's position at issuance time, so history visually narrates escalation chronologically), an `AlertTriangle` icon chip, a `"Warning N of {threshold}"` badge, and a second `Badge variant="destructive"` reading `"Triggered Suspension"` on any row where `triggered_escalation=true`. Empty state reuses this codebase's existing "All Clear!" idiom (`CheckCircle` in `text-green-500`, scaled to card size) — "No warnings on record. This user has a clean record."

**Warn dialog escalation preview** — a `bg-muted`-style block below the reason textarea (no new `Alert` primitive — not installed, and this exact need already has a precedent: the "Report Details" block in the moderation dialog):
- Non-triggering: `bg-orange-50 dark:bg-orange-950/20 border-orange-200`, `AlertTriangle`, "This will be warning 2 of 3. One more will trigger automatic suspension."
- Triggering: `border-destructive/40 bg-destructive/10`, `AlertOctagon` (already used elsewhere in the moderation page), `text-destructive font-medium` — "This warning will trigger automatic suspension." Confirm button swaps `variant="default"` → `"destructive"` and label → "Issue Warning & Suspend", mirroring the existing `actionType === "ban"` destructive-variant pattern already in this file.
- No looping/pulsing animation — a single `animate-in fade-in-0 slide-in-from-top-1 duration-200` entrance (existing `tw-animate-css` utility already used for `DialogContent`) is the ceiling; a persistent animation on a punitive confirmation reads as gamified, wrong register for an admin tool. Don't introduce `framer-motion` here even though it's in `package.json` — neither sibling dialog (suspend/ban) uses it, and this shouldn't be the one-off that breaks that consistency.

**Post-action feedback**: normal warning → `toast.success("Warning sent to {name} (2 of 3).")`, dialog closes, list refetches. Threshold-triggering warning → don't just toast-and-close; show an inline success state inside the dialog first ("Warning sent. {name} has now reached 3/3 and has been automatically suspended.") before closing, since this is the consequential case the issue is explicitly designed around.

## File-by-File List

**Backend — create**: `app/models/moderation.py`, `app/services/warning_service.py`, `alembic/versions/h2i3j4k5l6m7_add_user_warnings.py`, `tests/test_warnings.py`.
**Backend — modify**: `app/api/admin.py`, `app/api/moderation.py`, `app/schemas/admin.py`, `app/services/email_service.py`, `app/services/tasks.py`, `app/core/config.py`, `tests/conftest.py` (add a `test_admin_user` fixture — none exists today; every existing user fixture has `is_superuser=False`).
**Frontend — create**: `src/components/admin/WarningEscalationMeter.tsx`, `src/components/admin/WarningHistoryList.tsx`.
**Frontend — modify**: `src/types/admin.ts`, `src/services/adminService.ts`, `src/app/(protected)/admin/users/[id]/page.tsx`, `src/app/(protected)/admin/moderation/page.tsx` (toast copy only), `tests/e2e/admin.spec.ts`.

## Testing

**Backend** (`backend/tests/test_warnings.py`, pytest): issuing a warning creates the row + `AdminActionLog` entry; non-admin gets 403; warnings below threshold don't suspend, the Nth does (assert `user.suspended_at`/`suspended_until` after re-fetch); threshold is respected when overridden via `monkeypatch.setattr(settings, "WARNING_ESCALATION_THRESHOLD", 2)`; revoked warnings are excluded from the active count; `GET .../warnings` pagination/status filtering; `resolve_report(action="warn_user")` on a `POST`-type report warns the post's author, not the reporter; email dispatch is mocked (assert `send_warning_email_task.delay` called with expected args, never awaited inline) rather than hitting Resend.

**Frontend** (`frontend/tests/e2e/admin.spec.ts`): extend with a `Warnings` describe block following the file's existing `isVisible()`-guarded soft-assertion style; verify the warning history section renders on `/admin/users/{id}`, the issue-warning flow posts and shows a toast, and the moderation queue's "Warn User" button still resolves. Keep assertions behavior/network-focused, not layout-specific.

## Sequencing

1. Migration + `Warning` model (standalone).
2. `Settings` fields + `send_warning_email` + `send_warning_email_task` (independent, mock-testable).
3. `warning_service.issue_warning()` — depends on 1+2, get this unit-tested in isolation before wiring any endpoint.
4. `admin.py` endpoints, depends on 3.
5. `moderation.py` `resolve_report` delegation + `_resolve_report_target_user_id`, depends on 3.
6. Frontend types/service/components — can start once schemas are stable in review, doesn't need to wait for merge.
7. Tests throughout; escalation-threshold and revoke-doesn't-count-toward-escalation are the highest-value cases to get right before calling this done.

## Verification

- Backend: `cd backend && source venv/bin/activate && pytest tests/test_warnings.py -v`, then `pytest` (full suite) to confirm no regressions, especially `test_api_contract.py`'s schemathesis pass against the new endpoints.
- Manual: start both dev servers (`uvicorn app.main:app --reload`, `npm run dev`), log in as an admin (existing seeded admin or promote via `make-admin`), issue 3 warnings to a test user from `/admin/users/{id}` and confirm the 3rd auto-suspends and the escalation meter/history render correctly at each step; repeat via the moderation queue's "Warn User" button on a report.
- Frontend: `cd frontend && npm run lint && npm run test -- --run` for any unit tests touching the new components, then `npm run test:e2e -- admin.spec.ts`.
