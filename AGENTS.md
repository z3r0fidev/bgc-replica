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

# Sentry Configuration Guidance

These examples should be used as guidance when configuring Sentry functionality within a project.

# Exception Catching

Use `Sentry.captureException(error)` to capture an exception and log the error in Sentry.
Use this in try catch blocks or areas where exceptions are expected

# Tracing Examples

Spans should be created for meaningful actions within an applications like button clicks, API calls, and function calls
Use the `Sentry.startSpan` function to create a span
Child spans can exist within a parent span

## Custom Span instrumentation in component actions

The `name` and `op` properties should be meaninful for the activities in the call.
Attach attributes based on relevant information and metrics from the request

```javascript
function TestComponent() {
  const handleTestButtonClick = () => {
    // Create a transaction/span to measure performance
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Test Button Click",
      },
      (span) => {
        const value = "some config";
        const metric = "some metric";

        // Metrics can be added to the span
        span.setAttribute("config", value);
        span.setAttribute("metric", metric);

        doSomething();
      },
    );
  };

  return (
    <button type="button" onClick={handleTestButtonClick}>
      Test Sentry
    </button>
  );
}
```

## Custom span instrumentation in API calls

The `name` and `op` properties should be meaninful for the activities in the call.
Attach attributes based on relevant information and metrics from the request

```javascript
async function fetchUserData(userId) {
  return Sentry.startSpan(
    {
      op: "http.client",
      name: `GET /api/users/${userId}`,
    },
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      return data;
    },
  );
}
```

# Logs

Where logs are used, ensure Sentry is imported using `import * as Sentry from "@sentry/nextjs"`
Enable logging in Sentry using `Sentry.init({  enableLogs: true })`
Reference the logger using `const { logger } = Sentry`
Sentry offers a consoleLoggingIntegration that can be used to log specific console error types automatically without instrumenting the individual logger calls

## Configuration

In NextJS the client side Sentry initialization is in `instrumentation-client.(js|ts)`, the server initialization is in `sentry.server.config.ts` and the edge initialization is in `sentry.edge.config.ts`
Initialization does not need to be repeated in other files, it only needs to happen the files mentioned above. You should use `import * as Sentry from "@sentry/nextjs"` to reference Sentry functionality

### Baseline

```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://24e013259e2c4a9dbb6d65a3048366ba@o4510570655580160.ingest.us.sentry.io/4510581798010880",

  enableLogs: true,
});
```

### Logger Integration

```javascript
Sentry.init({
  dsn: "https://24e013259e2c4a9dbb6d65a3048366ba@o4510570655580160.ingest.us.sentry.io/4510581798010880",
  integrations: [
    // send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
});
```

## Logger Examples

`logger.fmt` is a template literal function that should be used to bring variables into the structured logs.

```javascript
logger.trace("Starting database connection", { database: "users" });
logger.debug(logger.fmt`Cache miss for user: ${userId}`);
logger.info("Updated profile", { profileId: 345 });
logger.warn("Rate limit reached for endpoint", {
  endpoint: "/api/results/",
  isEnterprise: false,
});
logger.error("Failed to process payment", {
  orderId: "order_123",
  amount: 99.99,
});
logger.fatal("Database connection pool exhausted", {
  database: "users",
  activeConnections: 100,
});
```
