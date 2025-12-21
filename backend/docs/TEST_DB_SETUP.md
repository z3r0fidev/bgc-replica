# Test Database Setup Guide

This guide outlines the steps to set up a local PostgreSQL database for testing purposes within the existing backend environment.

## Prerequisites

- **PostgreSQL**: Ensure PostgreSQL is installed and running on your local machine.
  - **Windows**: Download the installer from [postgresql.org](https://www.postgresql.org/download/windows/).
  - **macOS**: Use [Postgres.app](https://postgresapp.com/) or Homebrew (`brew install postgresql`).
  - **Linux**: Install via your package manager (e.g., `sudo apt install postgresql`).

- **Python Environment**: Ensure the backend virtual environment is activated.
  - `backend\venv\Scripts\activate` (Windows)
  - `source backend/venv/bin/activate` (macOS/Linux)

## Step 1: Create the Test Database

1.  **Open your terminal/command prompt.**
2.  **Access the PostgreSQL prompt (psql):**
    ```bash
    psql -U postgres
    ```
    *(Note: You may be prompted for the password you set during installation.)*

3.  **Create the database:**
    ```sql
    CREATE DATABASE bgc_test_db;
    ```

4.  **Create a dedicated test user (optional but recommended):**
    ```sql
    CREATE USER bgc_test_user WITH PASSWORD 'secure_test_password';
    GRANT ALL PRIVILEGES ON DATABASE bgc_test_db TO bgc_test_user;
    ALTER DATABASE bgc_test_db OWNER TO bgc_test_user;
    ```
    *(If using PostgreSQL 15+, you may need to grant schema privileges separately)*:
    ```sql
    \c bgc_test_db
    GRANT ALL ON SCHEMA public TO bgc_test_user;
    ```

5.  **Exit psql:**
    ```sql
    \q
    ```

## Step 2: Configure Environment Variables

1.  **Locate your `.env` file** in the `backend` directory.
2.  **Add or update the `DATABASE_URL` variable** to point to your new test database.
    - **Format**: `postgresql+asyncpg://<user>:<password>@<host>:<port>/<database_name>`
    - **Example**:
      ```ini
      DATABASE_URL=postgresql+asyncpg://bgc_test_user:secure_test_password@localhost:5432/bgc_test_db
      ```
    *(Note: Ensure you are using the `asyncpg` driver as per the project requirements.)*

## Step 3: Run Migrations

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Apply Alembic migrations to set up the schema:**
    ```bash
    # Ensure the virtual environment is active
    venv\Scripts\activate

    # Run migrations
    alembic upgrade head
    ```

## Step 4: Verify Connection

1.  **Run a simple check using the project's existing tests:**
    ```bash
    pytest
    ```
    *(Note: This assumes the tests are configured to use the `DATABASE_URL` from the environment or a `conftest.py` override. If tests fail due to connection issues, double-check your credentials and database status.)*

## Troubleshooting

- **`psql` not found**: Add the PostgreSQL `bin` directory (e.g., `C:\Program Files\PostgreSQL\16\bin`) to your system's PATH environment variable.
- **Connection Refused**: Ensure the PostgreSQL service is running. on Windows, check `services.msc`.
- **Driver Errors**: Ensure `asyncpg` is installed in your virtual environment (`pip install asyncpg`).
