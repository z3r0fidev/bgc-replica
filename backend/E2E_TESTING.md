# Backend E2E & API Testing Guide

This guide outlines API contract and E2E testing for the FastAPI backend using Pytest, Schemathesis, and HTTPX.

## 1. API Contract Testing (Schemathesis)
Schemathesis automatically generates test cases based on your OpenAPI schema to find crashes and specification violations.

### Usage (Pytest Integration)
The contract tests are located in `backend/tests/test_api_contract.py`. They use the `from_asgi` loader to test the application without a running server.

```python
import schemathesis
from app.main import app

# Set testing environment variable to skip heavy/production-only middleware if needed
os.environ["TESTING"] = "true"

schema = schemathesis.openapi.from_asgi("/openapi.json", app)

@schema.parametrize()
def test_api_contract(case, auth_headers):
    case.headers.update(auth_headers)
    response = case.call()
    case.validate_response(response)
```

## 2. Functional E2E Testing (Pytest + HTTPX)
Functional tests validate complete business flows using a test database and an isolated Redis client.

### Core Fixtures (`conftest.py`)
- `async_client`: An `httpx.AsyncClient` configured with `ASGITransport(app=app)`.
- `db_session`: A transactional database session that rolls back after each test.
- `auth_headers`: Provides a valid JWT Bearer token for the `test_user`.

### Example Test: Social Feed Flow
Located in `backend/tests/test_flows.py`:

```python
@pytest.mark.asyncio
async def test_create_post_flow(async_client, auth_headers):
    # 1. Create a status update
    post_resp = await async_client.post(
        "/api/feed/",
        json={"content": "E2E Test Post"},
        headers=auth_headers
    )
    assert post_resp.status_code in [200, 201]
    
    # 2. Verify it appears in global feed
    feed_resp = await async_client.get("/api/feed/", headers=auth_headers)
    assert feed_resp.status_code == 200
    assert any(p["content"] == "E2E Test Post" for p in feed_resp.json()["items"])
```

## 3. Execution
To run the full backend test suite:

```bash
cd backend
$env:PYTHONPATH="."
pytest tests/
```

### Specific Test Modules
- `pytest tests/test_api_contract.py` (API Specification compliance)
- `pytest tests/test_flows.py` (Business logic flows)
- `pytest tests/test_integrity.py` (Database constraints and cascades)

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