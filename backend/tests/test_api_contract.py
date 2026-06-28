import schemathesis
import pytest
from app.main import app
import os

# Set testing environment variable
os.environ["TESTING"] = "true"

from hypothesis import settings

schema = schemathesis.openapi.from_asgi("/openapi.json", app)


@schema.parametrize()
@settings(max_examples=5, deadline=None)
@pytest.mark.filterwarnings("ignore:coroutine 'Connection._cancel' was never awaited")
async def test_api_contract(case, auth_headers):
    # Skip some heavy endpoints for property-based testing if they are too flaky
    if "search" in case.path or "feed" in case.path:
        pass

    case.headers.update(auth_headers)
    try:
        response = await case.call_async()
        case.validate_response(response)
    except AttributeError as e:
        if "'NoneType' object has no attribute 'send'" in str(e):
            pytest.skip("Windows proactor event loop closing issue")
        raise e
