import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to BGCLive Replica API"}


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_cors_preflight_allows_sentry_trace_headers(client: AsyncClient):
    """Issue #72: the frontend's cross-origin fetch calls to
    NEXT_PUBLIC_API_URL attach sentry-trace/baggage headers for distributed
    tracing. If a CORS preflight doesn't allow them, the browser strips them
    before this backend ever sees them, silently breaking trace continuity
    for every request that isn't same-origin."""
    response = await client.options(
        "/",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "sentry-trace,baggage",
        },
    )
    assert response.status_code == 200
    allowed_headers = response.headers["access-control-allow-headers"].lower()
    assert "sentry-trace" in allowed_headers
    assert "baggage" in allowed_headers
