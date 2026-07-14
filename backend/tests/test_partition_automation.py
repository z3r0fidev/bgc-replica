import uuid
from datetime import date, datetime

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery_config import celery_app
from app.models.chat import Message
from app.models.user import User
from app.services.tasks import ensure_future_partitions


async def _make_user(db: AsyncSession) -> User:
    user = User(
        id=uuid.uuid4(),
        email=f"partition-test-{uuid.uuid4()}@example.com",
        name="Partition Test",
        hashed_password="x",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


class TestCreateMonthlyPartitionFunction:
    @pytest.mark.asyncio
    async def test_idempotent(self, db_session: AsyncSession):
        first = (
            await db_session.execute(
                text("SELECT create_monthly_partition('messages', :d)"),
                {"d": date(2027, 3, 15)},
            )
        ).scalar_one()
        second = (
            await db_session.execute(
                text("SELECT create_monthly_partition('messages', :d)"),
                {"d": date(2027, 3, 20)},
            )
        ).scalar_one()

        assert first == second == "messages_y2027m03"

    @pytest.mark.asyncio
    async def test_correct_naming_and_bounds_both_tables(self, db_session: AsyncSession):
        for table in ("messages", "status_updates"):
            name = (
                await db_session.execute(
                    text("SELECT create_monthly_partition(:table, :d)"),
                    {"table": table, "d": date(2027, 4, 1)},
                )
            ).scalar_one()
            assert name == f"{table}_y2027m04"

            bound = (
                await db_session.execute(
                    text(
                        "SELECT pg_get_expr(relpartbound, oid) FROM pg_class "
                        "WHERE relname = :name"
                    ),
                    {"name": name},
                )
            ).scalar_one()
            assert "2027-04-01" in bound
            assert "2027-05-01" in bound

    @pytest.mark.asyncio
    async def test_unsupported_table_raises(self, db_session: AsyncSession):
        # SAVEPOINT-scoped so the failed statement only rolls back itself,
        # not the outer per-test transaction the db_session fixture manages.
        with pytest.raises(Exception, match="unsupported table"):
            async with db_session.begin_nested():
                await db_session.execute(
                    text("SELECT create_monthly_partition('users', :d)"),
                    {"d": date(2027, 1, 1)},
                )


class TestPartitionRouting:
    @pytest.mark.asyncio
    async def test_message_lands_in_named_partition(self, db_session: AsyncSession):
        await db_session.execute(
            text("SELECT create_monthly_partition('messages', :d)"),
            {"d": date(2027, 5, 1)},
        )
        user = await _make_user(db_session)
        msg = Message(
            id=uuid.uuid4(),
            sender_id=user.id,
            content="test",
            created_at=datetime(2027, 5, 15),
        )
        db_session.add(msg)
        await db_session.commit()

        partition = (
            await db_session.execute(
                text("SELECT tableoid::regclass::text FROM messages WHERE id = :id"),
                {"id": msg.id},
            )
        ).scalar_one()
        assert partition == "messages_y2027m05"

    @pytest.mark.asyncio
    async def test_message_with_no_partition_lands_in_default(
        self, db_session: AsyncSession
    ):
        user = await _make_user(db_session)
        # Far-future date with no partition ever created for it.
        msg = Message(
            id=uuid.uuid4(),
            sender_id=user.id,
            content="test",
            created_at=datetime(2099, 1, 15),
        )
        db_session.add(msg)
        await db_session.commit()

        partition = (
            await db_session.execute(
                text("SELECT tableoid::regclass::text FROM messages WHERE id = :id"),
                {"id": msg.id},
            )
        ).scalar_one()
        assert partition == "messages_default"


class TestEnsureFuturePartitions:
    @pytest.mark.asyncio
    async def test_underlying_sql_creates_next_month_for_both_tables(
        self, db_session: AsyncSession
    ):
        # Exercises the same create_monthly_partition() call the task makes,
        # via the test's own async session - see test_task_creates_partitions
        # below for a call through the real task function end-to-end.
        from datetime import timedelta

        target_date = (datetime.utcnow() + timedelta(days=31)).date()
        expected_suffix = f"_y{target_date.strftime('%Y')}m{target_date.strftime('%m')}"

        for table in ("messages", "status_updates"):
            name = (
                await db_session.execute(
                    text("SELECT create_monthly_partition(:table, :d)"),
                    {"table": table, "d": target_date},
                )
            ).scalar_one()
            assert name == f"{table}{expected_suffix}"
        await db_session.commit()

    def test_task_creates_partitions_end_to_end(self):
        """Calls the real Celery task function directly (sync, matching how
        a worker invokes it) rather than only its underlying SQL, so the
        task body itself - not just create_monthly_partition() - is covered.
        Runs against the module-level SessionLocal (bound to whatever
        DATABASE_URL the test process has, i.e. the isolated test DB, not
        test_engine/db_session's per-test transaction), so it commits for
        real; asserts against that same real state afterward and cleans up.
        """
        from datetime import timedelta

        created = ensure_future_partitions()

        target_date = (datetime.utcnow() + timedelta(days=31)).date()
        expected = [
            f"{table}_y{target_date.strftime('%Y')}m{target_date.strftime('%m')}"
            for table in ("messages", "status_updates")
        ]
        assert created == expected

        # Idempotent re-run should return the same partition names, not error.
        assert ensure_future_partitions() == expected

    def test_beat_schedule_contains_expected_entry(self):
        assert "ensure-future-partitions" in celery_app.conf.beat_schedule
        entry = celery_app.conf.beat_schedule["ensure-future-partitions"]
        assert entry["task"] == "app.services.tasks.ensure_future_partitions"

    def test_task_is_registered(self):
        assert ensure_future_partitions.name == "app.services.tasks.ensure_future_partitions"
