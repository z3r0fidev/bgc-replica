"""
One-off, manual backfill for messages rows stuck in messages_default.

Background: the Dec 2025 partitioning migration only ever created a single
dated partition (messages_y2025m12) plus a DEFAULT catch-all. Automation to
create subsequent monthly partitions was never built until this issue (#66)
added create_monthly_partition() + a scheduled Celery Beat task. Every
message inserted since Jan 2026 has been silently landing in
messages_default.

Postgres refuses to create a new range partition if the DEFAULT partition
still holds any row that would fall inside that range (it scans the default
to check). So the order has to be: drain a month's rows OUT of
messages_default into a holding table first, THEN create that month's
partition, THEN re-insert - not "create partitions, then move data" as a
naive reading of the plan might suggest. Confirmed by hitting Postgres's
actual CheckViolationError during local testing before writing this final
version.

This script, per month:
  1. Batch-drains messages_default rows for that month into a session-scoped
     TEMP TABLE (small batches, to avoid a long lock while messages_default
     is still being written to concurrently).
  2. Once fully drained for that month, calls create_monthly_partition (now
     legal, since no default-partition rows remain in that range).
  3. Re-inserts the held rows into the messages parent, which now routes
     them to the correct partition.

Does NOT drop messages_default - it stays as the permanent safety net for
any row whose created_at falls outside all explicit partitions. A non-empty
messages_default after this script completes (and after the Beat schedule
is confirmed running) is the health signal that automation broke again.

Resumable by design: if the script is interrupted, some months may already
be fully migrated and skip (nothing left to drain), and any batch mid-drain
that isn't yet re-inserted stays safely in messages_default (having never
left it - the temp table itself is dropped at session end). Re-running
just repeats the drain/create/reinsert cycle for whatever remains.

Usage:
    cd backend && source venv/bin/activate
    python scripts/backfill_messages_partitions.py [--dry-run] [--batch-size 5000]
"""

import argparse
import asyncio
import os
import sys
from datetime import date

from sqlalchemy import text

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal  # noqa: E402


def add_month(d: date) -> date:
    return date(d.year + 1, 1, 1) if d.month == 12 else date(d.year, d.month + 1, 1)


def month_range(start: date, end: date):
    current = date(start.year, start.month, 1)
    stop = date(end.year, end.month, 1)
    while current <= stop:
        yield current
        current = add_month(current)


CREATE_HOLDING_TABLE_SQL = text(
    "CREATE TEMP TABLE IF NOT EXISTS backfill_holding "
    "(LIKE messages INCLUDING DEFAULTS) ON COMMIT PRESERVE ROWS"
)
TRUNCATE_HOLDING_TABLE_SQL = text("TRUNCATE backfill_holding")

DRAIN_BATCH_SQL = text("""
    WITH batch AS (
        SELECT ctid FROM messages_default
        WHERE created_at >= :start AND created_at < :end
        LIMIT :batch_size
    ),
    moved AS (
        DELETE FROM messages_default
        WHERE ctid IN (SELECT ctid FROM batch)
        RETURNING *
    )
    INSERT INTO backfill_holding SELECT * FROM moved
""")

REINSERT_BATCH_SQL = text("""
    WITH batch AS (
        SELECT ctid FROM backfill_holding LIMIT :batch_size
    ),
    moved AS (
        DELETE FROM backfill_holding
        WHERE ctid IN (SELECT ctid FROM batch)
        RETURNING *
    )
    INSERT INTO messages SELECT * FROM moved
""")


async def backfill(batch_size: int, dry_run: bool) -> None:
    async with SessionLocal() as db:
        earliest = (
            await db.execute(text("SELECT min(created_at) FROM messages_default"))
        ).scalar()
        if earliest is None:
            print("messages_default is already empty. Nothing to do.")
            return

        latest_needed = (
            await db.execute(text("SELECT max(created_at) FROM messages_default"))
        ).scalar()

        print(f"messages_default spans {earliest.date()} to {latest_needed.date()}")

        if dry_run:
            for month_start in month_range(earliest.date(), latest_needed.date()):
                month_end = add_month(month_start)
                count = (
                    await db.execute(
                        text(
                            "SELECT count(*) FROM messages_default "
                            "WHERE created_at >= :start AND created_at < :end"
                        ),
                        {"start": month_start, "end": month_end},
                    )
                ).scalar()
                print(f"[dry-run] {month_start}: would move {count} row(s)")
            return

        await db.execute(CREATE_HOLDING_TABLE_SQL)
        await db.commit()

        for month_start in month_range(earliest.date(), latest_needed.date()):
            month_end = add_month(month_start)

            drained = 0
            while True:
                result = await db.execute(
                    DRAIN_BATCH_SQL,
                    {"start": month_start, "end": month_end, "batch_size": batch_size},
                )
                await db.commit()
                moved = result.rowcount
                drained += moved
                if moved == 0:
                    break
                print(f"  {month_start}: drained {moved} (running total: {drained})")

            if drained == 0:
                print(f"{month_start}: nothing in messages_default, skipping")
                continue

            partition_name = (
                await db.execute(
                    text("SELECT create_monthly_partition('messages', :d)"),
                    {"d": month_start},
                )
            ).scalar_one()
            await db.commit()
            print(f"{month_start}: ensured partition {partition_name}")

            reinserted = 0
            while True:
                result = await db.execute(
                    REINSERT_BATCH_SQL, {"batch_size": batch_size}
                )
                await db.commit()
                moved = result.rowcount
                reinserted += moved
                if moved == 0:
                    break
            print(f"{month_start}: done, {reinserted} row(s) moved")

        await db.execute(TRUNCATE_HOLDING_TABLE_SQL)
        await db.commit()

        print("\nVerification - rows per partition:")
        rows = await db.execute(
            text(
                "SELECT tableoid::regclass, count(*) FROM messages "
                "GROUP BY 1 ORDER BY 1"
            )
        )
        for partition, count in rows:
            print(f"  {partition}: {count}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run", action="store_true", help="Report row counts without moving data"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=5000,
        help="Rows moved per batch within a month (default: 5000)",
    )
    args = parser.parse_args()
    asyncio.run(backfill(batch_size=args.batch_size, dry_run=args.dry_run))
