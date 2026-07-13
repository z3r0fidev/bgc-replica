# Runbook: Rolling Back PostgreSQL Partitioning (Issue #66)

Covers `messages` and `status_updates` partitioning, the `create_monthly_partition()` automation, and the Celery Beat schedule that keeps it running. See `specs/015-postgres-partitioning/plan.md` for full background.

## Trigger Conditions

Roll back only if partitioning is causing **application errors**, not just a missing future partition:

- A missing partition degrades gracefully — new rows land in `messages_default`/`status_updates_default` (the permanent catch-all), retrievable later. This is annoying (defeats the maintenance/analytics benefit) but not an outage.
- Real trigger conditions: write failures against `messages`/`status_updates`, migration-time errors on a fresh deploy, or the schema itself being in a state neither `alembic upgrade head` nor `alembic downgrade` can reconcile cleanly.

**If the only problem is a missed partition** (Beat didn't fire, or fired late): do not roll back. Instead:
1. Manually invoke `ensure_future_partitions` (via Celery: `celery -A app.services.tasks call app.services.tasks.ensure_future_partitions`, or directly call `create_monthly_partition(table, date)` via SQL).
2. If historical data has piled up in `messages_default`, re-run `backend/scripts/backfill_messages_partitions.py` (it's idempotent/resumable — safe to run again even if partially applied before).

## Pre-Rollback Checklist

1. **Disable the Beat schedule first** — stop new partition-dependent state changes mid-rollback. Redeploy `celery-worker` without `--beat` (edit `backend/start.sh`'s `celery-worker` branch, or in an emergency, scale the service to 0 and back up without beat).
2. **Snapshot row counts per partition** before touching anything:
   ```sql
   SELECT tableoid::regclass, count(*) FROM messages GROUP BY 1;
   SELECT tableoid::regclass, count(*) FROM status_updates GROUP BY 1;
   ```
3. Note the current time — useful for correlating against Supabase's point-in-time recovery if a restore ends up being necessary.

## Preferred Path: Partial Fix, Not `alembic downgrade`

For a table with live production traffic across many partitions, `alembic downgrade` is the **last resort**, not the first response:

- The migration's `downgrade()` does `INSERT INTO <table> (...) SELECT ... FROM <partitioned_version>` — this has to scan and copy every row across every partition **in one transaction**. On a large table this risks long lock hold times, timeouts, or bloat on Supabase's pooled connections.
- A full downgrade also requires reverting the app deploy (the `Message`/`StatusUpdate` models declare a composite primary key that only matches a partitioned schema — running old non-partition-aware code against a downgraded DB, or vice versa, is a real mismatch window).

**Reserve `alembic downgrade` for a genuinely corrupt/broken schema** (e.g. the partitioned structure itself is inconsistent, not just "automation stopped"). That should be rare if migrations are tested locally (as documented in `specs/015-postgres-partitioning/tasks.md`) before reaching `main`.

## If a Full Downgrade Is Genuinely Necessary

1. Put the app in maintenance/read-only mode if possible, or at minimum expect a write-availability gap on `messages`/`status_updates` during the downgrade.
2. Run `alembic downgrade` one revision at a time (`j4k5l6m7n8o9` → `i3j4k5l6m7n8` → ...), verifying row counts after each step against the pre-rollback snapshot.
3. Deploy the corresponding app revision (pre-partitioning models) in the same maintenance window.
4. Re-enable traffic, monitor error rates and query latency for at least 15 minutes before declaring the rollback complete.

## Post-Rollback Verification

- Row counts match the pre-rollback snapshot (accounting for any writes that succeeded during the window).
- `pytest` full backend suite passes against the rolled-back schema state (matching the version of the code actually deployed).
- No `InvalidRequestError`/`CheckViolationError` in application logs referencing `messages`/`status_updates`/`post_comments`.
- If `post_comments.post_id`'s FK to `status_updates.id` was dropped by the partitioning migration (expected — see the migration's docstring for why Postgres forbids restoring it on a partitioned table), confirm the downgrade path restores it (the `downgrade()` in `j4k5l6m7n8o9_partition_status_updates.py` does this automatically once the table is unpartitioned again).

## Known, Permanent Limitation (Not Rollback-Related)

Even in the fully-forward (partitioned) state, `post_comments.post_id` has no DB-level FK to `status_updates.id` — Postgres does not allow a standalone unique constraint on a partitioned table's non-partition-key column. Cascade-on-delete for comments relies entirely on the ORM's `cascade="all, delete-orphan"` (`StatusUpdate.comments` in `backend/app/models/community.py`). A raw SQL delete of a `status_update` bypassing the ORM will orphan its comments. This is accepted and documented, not a bug to "fix" during a rollback investigation.
