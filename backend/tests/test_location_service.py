import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.location import (
    get_lat_lng_from_zip,
    get_location_from_ip,
    index_user_location,
    search_users_nearby,
)


def _mock_httpx_client(json_data: dict):
    """Builds a mock for `async with httpx.AsyncClient() as client` whose
    `client.get(...)` returns a response with the given parsed JSON body."""
    response = MagicMock()
    response.json.return_value = json_data

    client = MagicMock()
    client.get = AsyncMock(return_value=response)

    context_manager = MagicMock()
    context_manager.__aenter__ = AsyncMock(return_value=client)
    context_manager.__aexit__ = AsyncMock(return_value=False)

    return context_manager


class TestGetLocationFromIp:
    @pytest.mark.asyncio
    async def test_localhost_returns_mock_location_without_http_call(self):
        with patch("app.services.location.httpx.AsyncClient") as mock_cls:
            result = await get_location_from_ip("127.0.0.1")

            mock_cls.assert_not_called()

        assert result == {"city": "New York", "state": "NY", "lat": 40.7128, "lng": -74.0060}

    @pytest.mark.asyncio
    async def test_private_192_range_returns_mock_location(self):
        result = await get_location_from_ip("192.168.1.50")

        assert result["city"] == "New York"

    @pytest.mark.asyncio
    async def test_successful_lookup_parses_response(self):
        fake_response = {
            "status": "success",
            "city": "Philadelphia",
            "regionName": "Pennsylvania",
            "lat": 39.9526,
            "lon": -75.1652,
        }
        with patch(
            "app.services.location.httpx.AsyncClient",
            return_value=_mock_httpx_client(fake_response),
        ):
            result = await get_location_from_ip("8.8.8.8")

        assert result == {
            "city": "Philadelphia",
            "state": "Pennsylvania",
            "lat": 39.9526,
            "lng": -75.1652,
        }

    @pytest.mark.asyncio
    async def test_failed_status_returns_none(self):
        fake_response = {"status": "fail", "message": "invalid query"}
        with patch(
            "app.services.location.httpx.AsyncClient",
            return_value=_mock_httpx_client(fake_response),
        ):
            result = await get_location_from_ip("0.0.0.0")

        assert result is None

    @pytest.mark.asyncio
    async def test_request_exception_returns_none(self):
        with patch("app.services.location.httpx.AsyncClient", side_effect=RuntimeError("boom")):
            result = await get_location_from_ip("8.8.8.8")

        assert result is None


class TestIndexAndSearchUserLocation:
    @pytest.mark.asyncio
    async def test_indexed_user_is_found_within_radius(self):
        user_id = uuid.uuid4()
        # Philadelphia city center
        await index_user_location(user_id, lat=39.9526, lng=-75.1652)

        # Search from a nearby point (West Philly, ~4km away)
        results = await search_users_nearby(39.9522, -75.1932, radius_km=50)

        members = [r[0] if isinstance(r, (list, tuple)) else r for r in results]
        assert str(user_id) in members

    @pytest.mark.asyncio
    async def test_user_outside_radius_is_excluded(self):
        user_id = uuid.uuid4()
        # Philadelphia
        await index_user_location(user_id, lat=39.9526, lng=-75.1652)

        # Search from Los Angeles, far outside any reasonable radius
        results = await search_users_nearby(34.0522, -118.2437, radius_km=10)

        members = [r[0] if isinstance(r, (list, tuple)) else r for r in results]
        assert str(user_id) not in members

    @pytest.mark.asyncio
    async def test_get_redis_error_returns_empty_list(self, monkeypatch):
        from app.services import location as location_module

        async def _broken_get_redis():
            raise ConnectionError("redis is down")

        monkeypatch.setattr(location_module, "get_redis", _broken_get_redis)

        results = await search_users_nearby(39.9526, -75.1652)

        assert results == []

    @pytest.mark.asyncio
    async def test_geosearch_error_returns_empty_list(self, monkeypatch):
        from app.services import location as location_module

        fake_redis = MagicMock()
        fake_redis.geosearch = AsyncMock(side_effect=ConnectionError("redis is down"))

        async def _fake_get_redis():
            return fake_redis

        monkeypatch.setattr(location_module, "get_redis", _fake_get_redis)

        results = await search_users_nearby(39.9526, -75.1652)

        assert results == []


class TestGetLatLngFromZip:
    def test_known_zip_returns_coordinates(self):
        assert get_lat_lng_from_zip("19102") == {"lat": 39.9526, "lng": -75.1652}

    def test_unknown_zip_returns_none(self):
        assert get_lat_lng_from_zip("00000") is None
