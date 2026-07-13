# Tasks: PostgreSQL Range Partitioning (Issue #66)

**Input**: `specs/015-postgres-partitioning/plan.md`
**Prerequisites**: plan.md (required)

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

**⚠ Local test DB safety note** (same landmine as #65): always override `DATABASE_URL`/`REDIS_URL` to local/throwaway containers before running `pytest` locally — the checked-in `.env` points at production Supabase and `conftest.py`'s `TEST_DATABASE_URL` derivation silently no-ops against it. See `/home/z3r0d3v/.claude/projects/.../memory/pytest_test_db_isolation_landmine.md` if unsure.

**Correction (pre-implementation)**: the plan's originally-flagged "F1" (missing FK constraints/index on `messages`) turned out to already be fixed by `96be264b314b_add_created_at_to_profile.py`, an autogenerate-style migration whose name gave no hint it touches `messages`. Confirmed empirically against a fresh migration chain before writing any code — no F1 fix needed, removed from scope. Original Phase 1 (F1) tasks deleted; phases renumbered below.

---

## Phase 1: Partition Automation Function

- [x] T001 Migration `i3j4k5l6m7n8_add_partition_automation_function.py` — generic `create_monthly_partition(target_table, target_date)` PL/pgSQL function, table-allowlisted, `down_revision="h2i3j4k5l6m7"`
- [x] T002 [P] Factored SQL into `backend/app/core/partitioning.py`, imported by both the migration and (later) the test fixture
- [x] T003 Added `ensure_future_partitions` Celery task in `backend/app/services/tasks.py` — no Sentry capture (discovered `sentry_sdk.init()` only runs in `app/main.py`, never imported by the Celery worker entrypoint, so it's not actually initialized there; used this codebase's real convention instead — print + re-raise, matching `email_service.py`)
- [x] T004 Added weekly `beat_schedule` entry in `backend/app/core/celery_config.py` (Monday 3am UTC)
- [x] T005 Updated `backend/start.sh` — `celery-worker` branch now runs `--beat` embedded in the same process
- [x] T006 Validated: migration applies cleanly on throwaway Postgres 17; `create_monthly_partition` confirmed idempotent (2nd call = NOTICE not error), correctly errors for `status_updates` (not partitioned yet, expected — that's Phase 3) and for an unsupported table name; Celery task's underlying async DB logic tested directly against the same container

**Checkpoint**: automation mechanism exists and is tested locally; not yet enabled in production.

---

## Phase 2: `messages_default` Backfill

- [x] T007 Wrote `backend/scripts/backfill_messages_partitions.py` — **plan correction discovered here**: Postgres rejects creating a new partition while `messages_default` still holds rows in that range (`CheckViolationError`), so the real flow is drain-into-a-temp-table → create partition → re-insert, not "create partitions then move data" as originally planned. Batched, resumable, `--dry-run` flag, ends with a per-partition row-count verification query.
- [x] T008 Validated against a throwaway Postgres 17 container seeded with 21 rows across Jan–Jul 2026 (all in `messages_default`, matching production): dry-run correctly reported without touching data; live run redistributed all 21 rows into 7 correctly-named/bounded partitions with `messages_default` left empty; re-run against the drained state correctly no-ops ("already empty")

**Checkpoint**: backfill script ready; execution against real Supabase data is a separate, explicitly-confirmed manual step (not part of automated task completion).

---

## Phase 3: `status_updates` Partitioning

- [x] T009 Migration `j4k5l6m7n8o9_partition_status_updates.py` — rename/recreate/copy with `PARTITION BY RANGE (created_at)`, composite PK, **preserving `author_id`/`group_id` FKs** (down_revision `i3j4k5l6m7n8`)
- [x] T010 **Plan correction discovered here**: Postgres flatly forbids a standalone `UNIQUE(id)` on a partitioned table (`FeatureNotSupportedError` — any unique constraint must include the partition key), so `post_comments.post_id`'s DB-level FK to `status_updates.id` cannot be preserved, not just "needs a workaround." Raised to the user, who explicitly accepted the tradeoff: FK dropped, relies on the ORM's existing `cascade="all, delete-orphan"` on `StatusUpdate.comments`. Documented at length in the migration's docstring.
- [x] T011 Same migration: creates current + next month partitions via `create_monthly_partition`, recreates all single-column indexes + BRIN index on the new parent
- [x] T012 Validated upgrade + downgrade against a throwaway Postgres 17 container (fresh chain from scratch both times). Downgrade needed a fix too: index names collided because renaming a table doesn't rename its indexes — reordered to drop the old renamed table (and its indexes) before creating new ones with the same names. Confirmed downgrade fully restores the plain table, all indexes, and `post_comments`'s FK.

**Checkpoint**: `status_updates` partitioning schema-complete and verified locally.

---

## Phase 4: Model & Call-Site Reconciliation

- [x] T013 [P] `backend/app/models/chat.py` — `Message.created_at` becomes `primary_key=True`, added `__table_args__ = {"postgresql_partition_by": "RANGE (created_at)"}`
- [x] T014 [P] `backend/app/models/community.py` — same treatment for `StatusUpdate`
- [x] **New, not originally in plan**: `postgresql_partition_by` turns out to make SQLAlchemy actually emit `PARTITION BY RANGE (...)` in generated DDL (confirmed via `CreateTable(...).compile()`) — meaning `PostComment.post_id`'s `ForeignKey("status_updates.id", ...)` would try to create the same impossible constraint `create_all()`-side that Postgres already rejected DB-side in Phase 3. Removed the `ForeignKey` from `PostComment.post_id`, added an explicit `primaryjoin="PostComment.post_id == foreign(StatusUpdate.id)"` so the ORM relationship still works without DB-level FK metadata. Verified: models still import/configure cleanly, `PostComment`'s generated DDL no longer references `status_updates`.
- [x] T015 Fixed `backend/app/api/moderation.py` line ~190 (report-detail endpoint): replaced `db.get(StatusUpdate, ...)` with `select(StatusUpdate).where(...)`
- [x] T016 Fixed `backend/app/api/moderation.py` line ~395 (`delete_content` action): same fix

---

## Phase 5: Test Infrastructure (F2) & Coverage

- [x] T017 Fixed `backend/tests/conftest.py`'s `test_engine` fixture: after `Base.metadata.create_all()` (which now emits genuinely partitioned `messages`/`status_updates` parents with zero children, confirmed via `CreateTable(...).compile()` — this was actually **blocking**, not just nice-to-have, since every test inserting a Message/StatusUpdate would otherwise fail with "no partition found for row"), creates the automation function + a DEFAULT + current-month partition for both tables using the same `app.core.partitioning` module the real migration uses.
- [x] **New, found via full-suite run against postgres:15**: a THIRD `db.get(StatusUpdate, ...)` call site existed — `_resolve_report_target_user_id()` in `backend/app/api/moderation.py` (added during #65's implementation, after the original #66 investigation ran, so it was never caught by that earlier "exactly two call sites" grep). Fixed the same way as T015/T016. Full suite (146 tests) now passes cleanly against postgres:15 with the real partitioned schema.
- [x] T018 `backend/tests/test_partition_automation.py` — idempotency, correct naming/bounds, unsupported-table exception (used a `begin_nested()` SAVEPOINT for the exception test so the failure doesn't poison the outer per-test transaction)
- [x] T019 Test: rows land in the correct partition (known date → named partition; unmapped date → `_default`)
- [x] T020 Test: `ensure_future_partitions`'s underlying logic creates next-month partitions for both tables; `beat_schedule` contains the expected entry; task is correctly registered
- [x] T021 Test (in `test_warnings.py`, new `TestModerationStatusReportPartitionRegression` class): `GET /queue?content_type=STATUS` includes the correct content preview; `delete_content` action actually removes the `StatusUpdate` row — regression guard for T015/T016 **and** the newly-found third call site
- [x] T022 Test (`TestMessageForeignKeyCascade`): raw-SQL delete of a `chat_room` with an associated message proves DB-level `ON DELETE CASCADE` fires without an ORM session load
- [x] T023 Full backend suite regression run — **156 passed, 1 xfailed**, clean, against postgres:15 (matching CI)

---

## Phase 6: Rollback Runbook

- [x] T024 Wrote `backend/docs/runbooks/partition-rollback.md` (no runbooks dir existed, created it) — trigger conditions, pre-rollback checklist, partial-fix-preferred-over-downgrade guidance, post-rollback verification, and the permanent `post_comments` FK limitation noted explicitly so it's not mistaken for rollback fallout

---

## Phase 7: Production Rollout (each step explicitly confirmed before executing, per this session's established pattern)

- [ ] T025 Apply rev1 (automation function) to Supabase
- [ ] T026 Apply rev2 (`status_updates` partitioning) to Supabase — low-traffic window
- [ ] T027 Run the `messages_default` backfill script against Supabase — low-traffic window, supervised
- [ ] T028 Deploy model + `moderation.py` fixes (same release as rev2)
- [ ] T029 Manually invoke `ensure_future_partitions` once in production, confirm correct partitions created
- [ ] T030 Enable the Beat schedule (redeploy `celery-worker` with `--beat`)
- [ ] T031 Verify: `messages_default`/`status_updates_default` are empty (or near-empty) in steady state; Beat fires on schedule
