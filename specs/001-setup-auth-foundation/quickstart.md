# Quickstart: Setup Auth & Foundation

## Prerequisites

*   Node.js 18+
*   Python 3.11+
*   Docker (optional, for local Postgres/Redis) or Supabase + Redis accounts

## Environment Setup

1.  **Clone & Install**
    ```bash
    git clone <repo>
    cd bgc-replica
    # Frontend
    cd frontend && npm install
    # Backend
    cd ../backend && pip install -r requirements.txt  # or poetry install
    ```

2.  **Environment Variables**
    Copy `.env.example` to `.env` in both frontend and backend:
    ```env
    # Frontend
    NEXT_PUBLIC_API_URL="http://localhost:8000"
    # Backend
    DATABASE_URL="postgresql://postgres:password@localhost:5432/bgc_replica"
    REDIS_URL="redis://localhost:6379"
    AUTH_SECRET="generate-me-with-openssl-rand-base64-32"
    AUTH_GOOGLE_ID="get-from-google-cloud-console"
    AUTH_GOOGLE_SECRET="get-from-google-cloud-console"
    ```

3.  **Database Initialization**
    ```bash
    # Backend
    alembic upgrade head
    ```

## Running the App

*   **Development**:
  - Backend: `uvicorn backend.main:app --reload` (localhost:8000)
  - Frontend: `cd frontend && npm run dev` (localhost:3000)
*   **Database GUI**: Use Supabase dashboard or pgAdmin for PostgreSQL

## Running Tests

*   **Backend Unit/Integration**: `pytest` (pytest)
*   **Frontend Unit/Integration**: `cd frontend && npm run test` (Vitest)
*   **End-to-End**: `cd frontend && npm run test:e2e` (Playwright)
    *   *Note*: Requires both servers running.

## Key Commands

*   `npx shadcn-ui@latest add [component]` - Add new UI component
*   `alembic revision --autogenerate -m "message"` - Generate DB migration
*   `alembic upgrade head` - Apply migrations
