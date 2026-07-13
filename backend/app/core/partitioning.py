"""SQL for the create_monthly_partition() Postgres function.

Single source of truth shared by the Alembic migration that creates this
function in real databases and the test fixture that needs it to exist
against the ephemeral test database, so partition-routing logic actually
gets exercised in CI instead of running against a non-partitioned
Base.metadata.create_all() schema.
"""

PARTITIONED_TABLES = ("messages", "status_updates")

CREATE_MONTHLY_PARTITION_FUNCTION_SQL = """
CREATE OR REPLACE FUNCTION create_monthly_partition(
    target_table TEXT,
    target_date DATE
) RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    IF target_table NOT IN ('messages', 'status_updates') THEN
        RAISE EXCEPTION 'create_monthly_partition: unsupported table %', target_table;
    END IF;

    start_date := date_trunc('month', target_date);
    end_date := start_date + INTERVAL '1 month';
    partition_name := target_table || '_y' || to_char(start_date, 'YYYY') || 'm' || to_char(start_date, 'MM');

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name, target_table, start_date, end_date
    );

    RETURN partition_name;
END;
$$ LANGUAGE plpgsql;
"""

DROP_MONTHLY_PARTITION_FUNCTION_SQL = (
    "DROP FUNCTION IF EXISTS create_monthly_partition(TEXT, DATE);"
)
