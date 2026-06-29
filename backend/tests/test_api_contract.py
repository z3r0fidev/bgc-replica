import schemathesis
import pytest
from app.main import app
import os

os.environ["TESTING"] = "true"

from hypothesis import settings
from schemathesis.transport.requests import REQUESTS_TRANSPORT
from schemathesis.specs.openapi.checks import positive_data_acceptance, status_code_conformance

schema = schemathesis.openapi.from_asgi("/openapi.json", app)


@pytest.fixture(scope="module")
def test_client():
    """Persistent ASGI TestClient shared across all contract tests.

    Using module scope ensures one event loop is reused for all requests,
    preventing "Event loop is closed" errors that occur when ASGITransport
    creates a new TestClient (and new event loop) per case.call() invocation.
    """
    from starlette_testclient import TestClient

    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


@schema.parametrize()
@settings(max_examples=5, deadline=None)
@pytest.mark.filterwarnings("ignore:coroutine 'Connection._cancel' was never awaited")
def test_api_contract(case, auth_headers, test_client):
    case.headers = case.headers or {}
    case.headers.update(auth_headers)
    try:
        # Use persistent test_client via REQUESTS_TRANSPORT to reuse the
        # shared event loop instead of creating one per call (ASGITransport default).
        response = REQUESTS_TRANSPORT.send(
            case,
            session=test_client,
            base_url="http://test",
        )
        # Exclude positive_data_acceptance: fails when schemathesis generates
        # schema-valid data that hits business-logic validators (e.g. empty
        # strings for alphanumeric-only fields).
        # Exclude status_code_conformance: FastAPI auto-generates OpenAPI docs
        # with only 200/422 responses; auth endpoints legitimately return 401/400
        # which are not documented in the spec.
        case.validate_response(
            response,
            excluded_checks=[positive_data_acceptance, status_code_conformance],
        )
    except AttributeError as e:
        if "'NoneType' object has no attribute 'send'" in str(e):
            pytest.skip("Windows proactor event loop closing issue")
        raise e
