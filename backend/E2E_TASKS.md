# E2E Tasks: Backend (FastAPI & Schemathesis)

**Goal**: Implement API contract and functional E2E testing for the FastAPI backend.

- [X] T001 [P] Install `schemathesis` in the backend virtual environment
- [X] T002 Implement API contract testing in `backend/tests/test_api_contract.py` using `schemathesis.from_asgi`
- [X] T003 [P] Configure `backend/tests/conftest.py` with the `async_client` fixture using HTTPX
- [X] T004 [US] Implement Social Feed business flow test (Post -> Feed Verification) in `backend/tests/test_flows.py`
- [X] T005 [P] Verify backend test suite execution via `pytest tests/`
