# E2E Tasks: Database (Integrity & Migrations)

**Goal**: Implement data integrity and migration lifecycle testing.

- [x] T001 [P] Install `pytest-alembic` in the backend virtual environment
- [x] T002 Implement the migration staircase test (Base -> Head -> Base) in `backend/tests/test_migrations.py`
- [x] T003 Configure test database isolation and automatic rollback logic in `backend/tests/conftest.py`
- [x] T004 Implement relational integrity verification (e.g., Cascade User Deletion) in `backend/tests/test_integrity.py`
