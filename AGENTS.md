# AGENTS.md

## Build/Lint/Test Commands
- **Build Frontend**: `cd frontend && npm run build` (Next.js production build)
- **Build Backend**: No build needed; run with `cd backend && uvicorn main:app --reload`
- **Lint Frontend**: `cd frontend && npm run lint` (ESLint)
- **Lint Backend**: `cd backend && black . && flake8 .` (Formatting and linting)
- **Test Frontend Unit**: `cd frontend && npm run test` (Vitest)
- **Test Frontend E2E**: `cd frontend && npm run test:e2e` (Playwright)
- **Test Backend**: `cd backend && pytest`
- **Run Single Test**: Frontend - `npm run test -- --run path/to/test`; Backend - `pytest -k test_name`

## Code Style Guidelines
- **Imports**: Group external libs first (alphabetically), then internal. Use absolute imports.
- **Formatting**: Prettier for JS/TS (2 spaces, single quotes); Black for Python (4 spaces).
- **Types**: Strict TypeScript - use interfaces/types, avoid `any`; Pydantic for Python schemas.
- **Naming**: PascalCase components/classes; camelCase vars/functions (JS/TS); snake_case (Python).
- **Error Handling**: Async/await with try/catch; descriptive error messages; log with console.error/@sentry.
- **Security**: Never log secrets; use Zod for validation; follow OWASP practices.
- **Comments**: Add for complex logic; use JSDoc/TSDoc for functions.