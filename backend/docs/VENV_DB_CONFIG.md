# Virtual Environment & Database Configuration

This document provides technical details on how the existing Python virtual environment (`backend/venv`) is configured to interact with the PostgreSQL test database.

## Environment Analysis

The virtual environment is built using **Python 3.14.0** and contains all necessary drivers for high-performance, asynchronous database operations.

### Key Database Packages Installed:
- **SQLAlchemy (2.0.45)**: The Object Relational Mapper (ORM) used for database interactions.
- **asyncpg (0.31.0)**: The high-performance, asyncio-based PostgreSQL driver.
- **psycopg2-binary (2.9.11)**: A secondary synchronous driver (often required by Alembic for certain operations).
- **Alembic (1.17.2)**: The database migration tool.

## Database Integration within Venv

To ensure the backend application and migrations correctly utilize the virtual environment's drivers, follow these configuration guidelines.

### 1. Database URL Protocol
The project is configured to use `asyncpg`. When setting your `DATABASE_URL` in the `.env` file, you **must** use the `postgresql+asyncpg://` prefix. This tells SQLAlchemy to use the asynchronous driver installed in the venv.

**Correct Format:**
`DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/bgc_test_db`

### 2. Alembic Configuration
Alembic is configured via `backend/alembic.ini` and `backend/alembic/env.py`. 
- `env.py` is programmed to automatically handle the transition between the standard URL and the asyncpg driver requirement.
- When running `alembic` commands, always ensure the venv is active so it can find the `asyncpg` and `sqlalchemy` libraries.

### 3. Running Scripts within the Venv
All database-related scripts (including seeding scripts) should be executed using the Python interpreter located within the virtual environment to avoid "ModuleNotFoundError" for `sqlalchemy` or `asyncpg`.

**Recommended Execution Pattern:**
```powershell
# From the backend directory
.\venv\Scripts\python.exe app/core/seed_forums.py
```

## Troubleshooting Venv Connections

- **ModuleNotFoundError: No module named 'asyncpg'**: This occurs if the script is run with a global Python interpreter instead of the venv interpreter. Always activate the venv or use the absolute path to the venv's python executable.
- **Driver not-supported error**: If you encounter an error stating the driver is not supported, ensure the `+asyncpg` suffix is present in your connection string.
- **Environment Variable Loading**: The project uses `pydantic-settings` to load the `.env` file. Ensure your `.env` is located in the `backend/` root directory for the configuration to be picked up automatically.
