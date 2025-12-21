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
