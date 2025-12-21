import pytest

def test_migrations_staircase(alembic_runner):
    """
    Go through every migration, upgrading and then downgrading.
    """
    # pytest-alembic built-in behavior for a 'staircase'
    # involves checking each revision in sequence.
    alembic_runner.migrate_up_to("head")
    # To verify downgrades, we can go back to base
    alembic_runner.migrate_down_to("base")
    # And finally up to head again for subsequent tests
    alembic_runner.migrate_up_to("head")