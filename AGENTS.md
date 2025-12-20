# AGENTS.md

## Build/Lint/Test Commands
- **Build Frontend**: `cd frontend && npm run build` (Next.js production build)
- **Build Backend**: No build; run `cd backend && uvicorn main:app --reload`
- **Lint Frontend**: `cd frontend && npm run lint` (ESLint)
- **Lint Backend**: `cd backend && black . && flake8 .`
- **Test Frontend Unit**: `cd frontend && npm run test` (Vitest)
- **Test Frontend E2E**: `cd frontend && npm run test:e2e` (Playwright)
- **Test Backend**: `cd backend && pytest`
- **Run Single Test**: Frontend `npm run test -- --run path/to/test`; Backend `pytest -k test_name`
- **Database Migration**: `cd backend && alembic upgrade head`
- **Seed Data**: `cd backend && python app/core/seed_forums.py`
- **Load Test**: `cd backend && locust -f tests/load_test.py`
- **PWA Audit**: `npx lighthouse http://localhost:3000 --view`

## Code Style Guidelines
- **Imports**: Group externals alphabetically, then internals. Use absolute imports.
- **Formatting**: Prettier for JS/TS (2 spaces, single quotes); Black for Python (4 spaces).
- **Types**: Strict TypeScript with interfaces; Pydantic for Python; avoid `any`.
- **Naming**: PascalCase components/classes; camelCase vars/functions (JS/TS); snake_case (Python).
- **Error Handling**: Async/await with try/catch; descriptive messages; log with Sentry.
- **Security**: Never log secrets; use Zod validation; follow OWASP; encrypt sensitive data.
- **Comments**: JSDoc/TSDoc for functions; explain complex logic.