# Issue #66 — PostgreSQL Range Partitioning for `messages` & `status_updates`

## Context

`messages` was already partitioned by `created_at` in December 2025 (`backend/alembic/versions/20251220_partition_messages.py`), but the automation to create new monthly partitions was never built — only `messages_y2025m12` was ever created, plus a `messages_default` catch-all. Every message since January 2026 has been silently landing in that default partition, defeating the whole point. `status_updates` was never partitioned at all. This plan fixes the broken automation, backfills the mis-routed data, and partitions `status_updates` too, per the user's explicit decision to proceed with full scope despite the app's hot-path queries (chat filtered by `conversation_id`/`room_id`; feed reads via Redis fan-out + Postgres `id IN (...)`) not benefiting from `created_at`-based pruning — the real value here is table maintenance/vacuum at scale, analytics query performance, and future data retention/archival.

One more issue surfaced during investigation, riding on the same broken migration, fixed as part of this work:
- **F2**: `backend/tests/conftest.py`'s `test_engine` fixture builds schema via `Base.metadata.create_all()`, which has no concept of `PARTITION BY RANGE` — today's test suite never exercises the real partitioned shape of `messages` at all. Needs a fixture fix so the new partition-routing logic actually gets test coverage.

**Correction from the original plan**: the originally-flagged "F1" (missing FK constraints/index on `messages`, believed dropped by the Dec 2025 partition migration) turned out to already be fixed — `96be264b314b_add_created_at_to_profile.py`, an autogenerate-style migration with a name that gives no hint it touches `messages`, restores all three FKs and `ix_messages_sender_id`. Confirmed empirically against a fresh migration chain on a throwaway Postgres 17 container before writing any new code. No F1 fix is needed; removed from this plan.

Since the last planning pass, the Celery worker production incident was fixed (a `celery-worker` Railway service now exists and runs). This changes the automation mechanism from "add a new `beat:` Procfile line requiring a third Railway service" to simply adding `--beat` to the celery-worker service's existing start command — simpler, no new billed service needed.

## 1. Partition automation function — own migration

New migration `<rev1>_add_partition_automation_function.py` (`down_revision = "h2i3j4k5l6m7"`, current head). One generic PL/pgSQL function, table-allowlisted for safety (interpolated via `format(%I, ...)`):

```sql
CREATE OR REPLACE FUNCTION create_monthly_partition(
    target_table TEXT, target_date DATE
) RETURNS TEXT AS $$
DECLARE
    partition_name TEXT; start_date DATE; end_date DATE;
BEGIN
    IF target_table NOT IN ('messages', 'status_updates') THEN
        RAISE EXCEPTION 'create_monthly_partition: unsupported table %', target_table;
    END IF;
    start_date := date_trunc('month', target_date);
    end_date := start_date + INTERVAL '1 month';
    partition_name := target_table || '_y' || to_char(start_date, 'YYYY') || 'm' || to_char(start_date, 'MM');
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name, target_table, start_date, end_date);
    RETURN partition_name;
END;
$$ LANGUAGE plpgsql;
```

No per-partition index DDL — indexes created once on the partitioned parent (already true for `ix_messages_conversation_created`, `ix_messages_room_created`, the BRIN indexes) propagate automatically to every current and future partition.

**Automation**: add `ensure_future_partitions` Celery task in `backend/app/services/tasks.py`, calling `create_monthly_partition` for both tables one month ahead. Wrap in try/except → `Sentry.captureException()` on failure, then re-raise so Celery marks it failed (visible in monitoring) — this exact silent-failure mode is what caused the original incident. Add a `beat_schedule` entry in `backend/app/core/celery_config.py`, weekly cadence (not monthly-only — idempotent via `IF NOT EXISTS`, so extra runs are free, and a weekly cadence means at most a few days of drift if one run fails, vs. up to a month with a single monthly fire). Update the `celery-worker` Railway service's start command (in `backend/start.sh`, still branching on `RAILWAY_SERVICE_NAME`) to add `--beat` to the existing worker invocation — no new Railway service needed now that celery-worker exists.

## 3. Backfill `messages_default`

Postgres can't redistribute existing DEFAULT-partition rows automatically — only new inserts get routed by range. **Corrected during implementation**: the original ordering below ("create partitions first, then move data") is actually rejected by Postgres — `CREATE TABLE ... PARTITION OF ... FOR VALUES FROM (...) TO (...)` scans the DEFAULT partition and raises `CheckViolationError` if any existing row there would fall inside the new range. Confirmed by hitting this error against a locally-seeded throwaway container before finalizing the script. Correct order, implemented in `backend/scripts/backfill_messages_partitions.py`:
1. Per month, batch-drain matching rows OUT of `messages_default` into a session-scoped `TEMP TABLE` first (small batches — `DELETE ... RETURNING` into the holding table, looped until that month's rows are fully drained).
2. Only once a month is fully drained, call `create_monthly_partition('messages', ...)` for it (now legal).
3. Re-insert the held rows into the `messages` parent, which now routes them to the correct partition.

Resumable by design: an interruption leaves affected rows still safely in `messages_default` (nothing is lost mid-drain since the temp table only fills as rows are removed in the same transaction) or already fully migrated for earlier months; re-running just repeats the cycle for whatever remains. Ends with a verification query (`SELECT tableoid::regclass, count(*) FROM messages GROUP BY 1;`). **Do not drop `messages_default`** — keep it as the permanent safety net; a non-empty one in steady state is the health signal that automation broke again.

Validated locally end-to-end: seeded a throwaway container with rows spanning Jan–Jul 2026 (all correctly landing in `messages_default`, matching production), ran the script, confirmed all rows redistributed into 7 correctly-named/bounded monthly partitions and `messages_default` left empty, and confirmed re-running against an already-drained default is a safe no-op.

Run this script manually against production, during a low-traffic window, with you present to watch row counts/lock behavior — not something to automate blindly given it's a live production table.

## 4. `status_updates` partitioning — own migration

New migration `<rev2>_partition_status_updates.py` (must land after rev1, since it calls `create_monthly_partition`), following the same shape as the Dec 2025 `messages` migration but correctly — this time preserving FK constraints (`author_id`, `group_id`) unlike the original mistake:
1. `rename_table("status_updates", "status_updates_old")`
2. `CREATE TABLE status_updates (... PRIMARY KEY (id, created_at), author_id ... REFERENCES users(id) ON DELETE CASCADE, group_id ... REFERENCES community_groups(id) ON DELETE CASCADE) PARTITION BY RANGE (created_at);`
3. `CREATE TABLE status_updates_default PARTITION OF status_updates DEFAULT;`
4. Create current + next month's partition via `create_monthly_partition`.
5. `INSERT INTO status_updates SELECT * FROM status_updates_old;` then drop the old table. Check row count first (`SELECT count(*) FROM status_updates;`) to decide if this needs the same batched-script treatment as `messages` or is small enough for one transaction — the Redis fan-out architecture means this table is comparatively low direct-Postgres-traffic, so this is about write-lock duration, not read contention.
6. Recreate the existing `created_at` BRIN index against the new parent.
7. **Corrected during implementation**: the original plan here called for `op.create_unique_constraint("uq_status_updates_id", "status_updates", ["id"])` to satisfy `PostComment.post_id`'s FK to `status_updates.id` alone. This is not possible — Postgres rejects *any* unique constraint on a partitioned table that doesn't include the partitioning column (`FeatureNotSupportedError`, confirmed empirically), so a standalone `UNIQUE(id)` can't exist regardless of the already-composite PK. Raised to the user, who accepted the tradeoff: `post_comments.post_id`'s DB-level FK to `status_updates.id` is dropped and not recreated; the ORM's existing `cascade="all, delete-orphan"` on `StatusUpdate.comments` (`backend/app/models/community.py`) is the only enforcement going forward. (Checked: nothing FKs to `messages.id` alone, so this doesn't affect `messages`.)

## 5. Model reconciliation

`backend/app/models/chat.py`'s `Message` and `backend/app/models/community.py`'s `StatusUpdate`: change `created_at` to also be `primary_key=True` (composite PK matching the real DB shape), add `__table_args__` partition-by hint for documentation parity. `Message`'s FK declarations are already correct in both the model and the live DB (see the F1 correction in Context) — no change needed there beyond the PK. `StatusUpdate`'s FKs must be preserved in the new migration (see §4).

**Breaking call sites**: `db.get(StatusUpdate, id)` doesn't work against a composite-PK table — raises `InvalidRequestError` at runtime, not a silent wrong answer. Exactly two call sites, both in `backend/app/api/moderation.py` (lines ~190 and ~388, inside the report-detail endpoint and the `delete_content` moderation action): replace with `(await db.execute(select(StatusUpdate).where(StatusUpdate.id == report.content_id))).scalar_one_or_none()`. No `db.get(Message, ...)` calls exist anywhere (chat.py already uses `select()` throughout).

## 6. Test infrastructure fix (F2)

`backend/tests/conftest.py`'s `test_engine` fixture needs to actually exercise partitioned schema, not just `Base.metadata.create_all()`. Factor the partition-creation SQL (the `create_monthly_partition` function body + a call creating the current month's partition for both tables) into a small shared helper imported by both the Alembic migration and the test fixture, so there's one source of truth and the fixture isn't a parallel reimplementation that can drift.

## 7. Rollback runbook

Not just `downgrade()` — write a short runbook (`backend/docs/runbooks/partition-rollback.md` or fold into the PR description if no runbooks dir exists) covering: trigger conditions (app errors, not just "a partition is missing" — that degrades gracefully into the default partition), pre-rollback checklist (disable Beat schedule first, snapshot per-partition row counts), and explicitly recommending **partial** fixes (rerun the backfill script, manually invoke `create_monthly_partition`) over a full `alembic downgrade` — a full downgrade's `INSERT ... SELECT` across every partition in one transaction risks long locks/timeouts on a live table and should be reserved for a genuinely corrupt schema, not a missed automation run.

## 8. Migration sequencing

1. rev1 (partition automation function — zero risk, pure function def)
2. rev2 (`status_updates` partitioning — highest risk, live-table rename+copy)
3. Manual: run the `messages_default` backfill script, low-traffic window, supervised
4. Deploy model + `moderation.py` fixes in the **same release** as rev2
5. Enable the Beat schedule last, only after confirming `create_monthly_partition` behaves correctly via a manual one-off call

Adding a *new* partition to an already-partitioned table only takes a brief `SHARE UPDATE EXCLUSIVE` lock — safe to automate via Beat with no business-hours restriction. The `status_updates` initial rename+copy (step 2) is the one step needing a deliberate low-traffic window regardless of table size.

## 9. Testing plan

- `backend/tests/test_partition_automation.py` (new, against real Postgres — this needs real DB behavior, not mocks): `create_monthly_partition` idempotency (call twice, same result), correct partition naming/bounds for both tables, exception on unsupported table name.
- Rows land in the right partition: insert with a known `created_at`, assert `SELECT tableoid::regclass` matches the expected partition (and separately, a date with no partition yet lands in `_default`) — this directly tests the exact failure mode from the original incident.
- `ensure_future_partitions` Celery task: call directly (not through the scheduler), assert it creates next month's partition for both tables; assert `celery_app.conf.beat_schedule` contains the expected entry (cheap regression guard against an accidental removal).
- The two fixed `moderation.py` call sites: a test creating a `STATUS`-type `ContentReport`, hitting the report-detail endpoint and `delete_content` action, asserting both succeed (would have hard-failed with `InvalidRequestError` pre-fix).
- FK cascade coverage (not previously tested, low cost to add now given the partitioning work already touches this table's schema): a raw-SQL delete of a `chat_room`/`conversation`/`user` with associated messages, proving DB-level `ON DELETE CASCADE` fires even when the ORM never loaded the children — this is the one path that wouldn't be caught by existing ORM-cascade tests, if any exist.

### Critical Files
- `backend/alembic/versions/20251220_partition_messages.py` (existing, being built on)
- `backend/app/models/chat.py`, `backend/app/models/community.py`
- `backend/app/api/moderation.py`
- `backend/app/services/tasks.py`, `backend/app/core/celery_config.py`
- `backend/start.sh`
- `backend/tests/conftest.py`

## Verification

- Local: validate each new migration's upgrade/downgrade against a throwaway Postgres 17 container before touching the real Supabase DB (same pattern used for #65's migration).
- `pytest backend/tests/test_partition_automation.py backend/tests/test_migrations.py -v` plus full suite regression.
- Manual against real infra (with explicit sign-off before each production-touching step, matching this session's established pattern): apply migrations to Supabase, run the backfill script during a supervised low-traffic window, confirm `messages_default`/`status_updates_default` are empty in steady state, confirm the Beat schedule fires and creates a partition ahead of need.
