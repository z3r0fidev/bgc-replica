# Database Integrity & E2E Testing Guide

This guide covers testing data integrity and schema migrations during E2E cycles.

## 1. Migration Testing (Alembic)
Ensure that your database can always be upgraded from base to head and downgraded back.

### Installation
```bash
pip install pytest-alembic
```

### Usage
Create `tests/test_migrations.py`:
```python
def test_migrations_staircase(alembic_config):
    # This test will go through every migration one by one
    # Upgrading and then downgrading
    pass 
```

---

## 2. Data Integrity Checks
During E2E tests, verify that relational constraints (e.g., Cascading Deletes) work as expected.

### Example Test: Cascade Delete
```python
async def test_user_deletion_cascades(db_session, async_client, user_id):
    # Delete User
    await async_client.delete(f"/api/users/{user_id}")
    
    # Verify Profile is also gone
    profile = await db_session.execute(select(Profile).where(Profile.id == user_id))
    assert profile.scalar() is None
```

---

## 3. Test Database Isolation
Always use a separate database for E2E testing to prevent data corruption.

### Setup
In `backend/tests/conftest.py`:
1. Use `DATABASE_URL` pointing to `bgc_test_db`.
2. Run `alembic upgrade head` in the session setup.
3. Use a transaction-per-test pattern to rollback changes after each test.
```python
@pytest.fixture(autouse=True)
async def force_rollback(db_session):
    yield
    await db_session.rollback()
```
