# CI/CD Implementation Guide: GitHub Actions

**Target System:** GitHub Actions
**Project:** BGC Replica Monorepo
**Date:** December 23, 2025

## 1. Overview
This guide details the setup of a robust CI/CD pipeline using GitHub Actions. The pipeline is designed to respect the monorepo structure, ensuring that frontend and backend tasks run independently and efficiently.

### Goals
*   **Automated Quality Gates:** Prevent broken code from merging to main.
*   **Monorepo Efficiency:** Only run workflows for modified components.
*   **Security:** Scan for vulnerabilities and secrets.
*   **Deployment Readiness:** Build artifacts automatically.

---

## 2. Prerequisites
1.  **GitHub Repository:** The project must be hosted on GitHub.
2.  **Secrets:** Configure the following repository secrets (`Settings > Secrets and variables > Actions`):
    *   `DATABASE_URL`: (For running backend tests/migrations in CI, usually a test DB or service container)
    *   `NEXT_PUBLIC_SUPABASE_URL`: (For frontend build)
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (For frontend build)
    *   *Note: For CI, we will often mock these or use service containers.*

---

## 3. Workflow Structure
Create the directory `.github/workflows/` in the project root. We will create three separate workflow files.

### A. Backend CI (`.github/workflows/backend-ci.yml`)
**Triggers:** Push/PR to `main` involving `backend/**`.
**Tasks:** Linting (Ruff), Type Checking (Mypy), Testing (Pytest).

### B. Frontend CI (`.github/workflows/frontend-ci.yml`)
**Triggers:** Push/PR to `main` involving `frontend/**`.
**Tasks:** Linting (ESLint), Type Checking (TSC), Unit Testing (Vitest), Build Check.

### C. End-to-End Tests (`.github/workflows/e2e.yml`)
**Triggers:** Nightly or on 'Deployment' tag.
**Tasks:** Full stack Playwright testing.

---

## 4. Implementation Details

### Step 1: Create Backend Workflow
Create `.github/workflows/backend-ci.yml`:

```yaml
name: Backend CI

on:
  push:
    branches: [ "main" ]
    paths: [ "backend/**" ]
  pull_request:
    branches: [ "main" ]
    paths: [ "backend/**" ]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend

    services:
      # Service container for Postgres to run integration tests
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: password
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Install Dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest ruff mypy httpx coverage

      - name: Lint with Ruff
        run: ruff check .

      - name: Type Check with Mypy
        run: mypy .

      - name: Run Tests
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/test_db
          # Add other necessary env vars here
        run: |
          pytest --cov=app --cov-report=xml

      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./backend/coverage.xml
          flags: backend
```

### Step 2: Create Frontend Workflow
Create `.github/workflows/frontend-ci.yml`:

```yaml
name: Frontend CI

on:
  push:
    branches: [ "main" ]
    paths: [ "frontend/**" ]
  pull_request:
    branches: [ "main" ]
    paths: [ "frontend/**" ]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install Dependencies
        run: npm ci

      - name: Lint (ESLint)
        run: npm run lint

      # Assumes a script "type-check": "tsc --noEmit" in package.json
      # If not present, add it or run tsc directly
      - name: Type Check (TypeScript)
        run: npx tsc --noEmit

      - name: Run Unit Tests
        run: npm run test:unit # Ensure this script exists in package.json (e.g. vitest run)
        
      - name: Verify Build
        run: npm run build
        env:
          # Mock vars to allow build to pass without real keys
          NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: mock-key
```

### Step 3: Create E2E Workflow
Create `.github/workflows/e2e.yml`:

```yaml
name: E2E Tests

on:
  deployment_status:
  workflow_dispatch: # Allow manual trigger

jobs:
  playwright:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    defaults:
      run:
        working-directory: ./frontend
    
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install Dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run Playwright Tests
        run: npx playwright test
        env:
          # In a real scenario, you might point this to a preview URL
          BASE_URL: http://localhost:3000 

      - name: Upload Artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 30
```

---

## 5. Deployment Strategy (CD)

While CI ensures quality, CD handles delivery.

1.  **Frontend (Vercel):**
    *   Connect your GitHub repository to Vercel.
    *   Vercel automatically detects Next.js and creates deployments for every push.
    *   **Action:** Configure Vercel to only deploy `main` to production.

2.  **Backend (Render/Railway/AWS):**
    *   **Option A (Automatic):** Connect the repo to the host. Configure the "Root Directory" to `backend`.
    *   **Option B (GitHub Action):** Use a deploy action.
    *   *Example for Deploy Hook (Generic):*
    ```yaml
    deploy-backend:
      needs: quality-check
      runs-on: ubuntu-latest
      if: github.ref == 'refs/heads/main'
      steps:
        - name: Trigger Deploy
          run: curl -X POST ${{ secrets.DEPLOY_HOOK_URL }}
    ```

## 6. Next Steps
1.  **Commit:** Commit the `.github` folder to your repository.
2.  **Monitor:** Watch the "Actions" tab in GitHub for the first run.
3.  **Refine:** Adjust triggers or environment variables as needed based on failures.
4.  **Branch Protection:** Go to GitHub Settings > Branches > Add rule for `main`. Require "Backend CI" and "Frontend CI" status checks to pass before merging.
