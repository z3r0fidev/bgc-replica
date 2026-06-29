"""
Integration tests for Gallery API

Spec 010 - Media Gallery & Albums
"""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock
import uuid
import io


# Mock storage service for testing
@pytest.fixture
def mock_storage():
    with patch("app.api.gallery.storage_service") as mock:
        mock.upload_file = MagicMock(
            return_value={
                "url": "https://storage.example.com/test.jpg",
                "storage_path": "test-user/gallery/test.jpg",
            }
        )
        mock.delete_file = MagicMock()
        yield mock


class TestMediaUpload:
    """Tests for POST /api/gallery/upload"""

    @pytest.mark.asyncio
    async def test_upload_image_success(
        self, client: AsyncClient, auth_headers: dict, mock_storage
    ):
        """Should upload an image and return media object"""
        # Create a fake image file
        image_content = b"fake image content" * 100
        files = {"file": ("test.jpg", io.BytesIO(image_content), "image/jpeg")}

        response = await client.post(
            "/api/gallery/upload",
            files=files,
            headers=auth_headers,
        )

        assert response.status_code == 200, f"upload got {response.status_code}: {response.text}"
        data = response.json()
        assert data["type"] == "IMAGE"
        assert "id" in data
        assert "url" in data

    @pytest.mark.asyncio
    async def test_upload_with_privacy(
        self, client: AsyncClient, auth_headers: dict, mock_storage
    ):
        """Should respect privacy parameter"""
        image_content = b"fake image content" * 100
        files = {"file": ("test.jpg", io.BytesIO(image_content), "image/jpeg")}

        response = await client.post(
            "/api/gallery/upload?privacy=PRIVATE",
            files=files,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["privacy"] == "PRIVATE"

    @pytest.mark.asyncio
    async def test_upload_unsupported_type(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Should reject unsupported file types"""
        files = {
            "file": (
                "test.exe",
                io.BytesIO(b"fake content"),
                "application/octet-stream",
            )
        }

        response = await client.post(
            "/api/gallery/upload",
            files=files,
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Unsupported file type" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_upload_file_too_large(self, client: AsyncClient, auth_headers: dict):
        """Should reject files exceeding size limit"""
        # 15MB image (exceeds 10MB limit)
        large_content = b"x" * (15 * 1024 * 1024)
        files = {"file": ("large.jpg", io.BytesIO(large_content), "image/jpeg")}

        response = await client.post(
            "/api/gallery/upload",
            files=files,
            headers=auth_headers,
        )

        assert response.status_code == 413

    @pytest.mark.asyncio
    async def test_upload_requires_auth(self, client: AsyncClient, mock_storage):
        """Should require authentication"""
        files = {"file": ("test.jpg", io.BytesIO(b"content"), "image/jpeg")}

        response = await client.post("/api/gallery/upload", files=files)

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_upload_video_mp4(
        self, client: AsyncClient, auth_headers: dict, mock_storage
    ):
        """Should upload MP4 video and return media object"""
        video_content = b"fake video content" * 1000
        files = {"file": ("test.mp4", io.BytesIO(video_content), "video/mp4")}

        response = await client.post(
            "/api/gallery/upload",
            files=files,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "VIDEO"
        assert "id" in data
        assert "url" in data

    @pytest.mark.asyncio
    async def test_upload_video_webm(
        self, client: AsyncClient, auth_headers: dict, mock_storage
    ):
        """Should upload WebM video"""
        video_content = b"fake webm content" * 1000
        files = {"file": ("test.webm", io.BytesIO(video_content), "video/webm")}

        response = await client.post(
            "/api/gallery/upload",
            files=files,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "VIDEO"

    @pytest.mark.asyncio
    async def test_upload_video_with_privacy(
        self, client: AsyncClient, auth_headers: dict, mock_storage
    ):
        """Should upload video with privacy setting"""
        video_content = b"fake video" * 1000
        files = {"file": ("private.mp4", io.BytesIO(video_content), "video/mp4")}

        response = await client.post(
            "/api/gallery/upload?privacy=FRIENDS_ONLY",
            files=files,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["privacy"] == "FRIENDS_ONLY"
        assert data["type"] == "VIDEO"

    @pytest.mark.asyncio
    async def test_upload_video_too_large(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Should reject videos exceeding 100MB limit"""
        # 105MB video (exceeds 100MB limit)
        large_content = b"x" * (105 * 1024 * 1024)
        files = {"file": ("large.mp4", io.BytesIO(large_content), "video/mp4")}

        response = await client.post(
            "/api/gallery/upload",
            files=files,
            headers=auth_headers,
        )

        assert response.status_code == 413


class TestMediaList:
    """Tests for GET /api/gallery/"""

    @pytest.mark.asyncio
    async def test_list_media_empty(self, client: AsyncClient, auth_headers: dict):
        """Should return empty list for new user"""
        response = await client.get("/api/gallery/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        assert "total_count" in data

    @pytest.mark.asyncio
    async def test_list_media_with_filter(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Should filter by media type"""
        response = await client.get(
            "/api/gallery/?type=IMAGE",
            headers=auth_headers,
        )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_media_pagination(self, client: AsyncClient, auth_headers: dict):
        """Should support cursor pagination"""
        response = await client.get(
            "/api/gallery/?limit=10",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "next_cursor" in data


class TestMediaGet:
    """Tests for GET /api/gallery/{id}"""

    @pytest.mark.asyncio
    async def test_get_nonexistent_media(self, client: AsyncClient, auth_headers: dict):
        """Should return 404 for nonexistent media"""
        fake_id = str(uuid.uuid4())

        response = await client.get(
            f"/api/gallery/{fake_id}",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestMediaDelete:
    """Tests for DELETE /api/gallery/{id}"""

    @pytest.mark.asyncio
    async def test_delete_nonexistent_media(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Should return 404 for nonexistent media"""
        fake_id = str(uuid.uuid4())

        response = await client.delete(
            f"/api/gallery/{fake_id}",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestAlbumCRUD:
    """Tests for album CRUD operations"""

    @pytest.mark.asyncio
    async def test_create_album(self, client: AsyncClient, auth_headers: dict):
        """Should create a new album"""
        response = await client.post(
            "/api/gallery/albums",
            json={
                "title": "Test Album",
                "description": "A test album",
                "privacy": "PUBLIC",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Test Album"
        assert data["media_count"] == 0

    @pytest.mark.asyncio
    async def test_create_album_validation(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Should validate album title"""
        response = await client.post(
            "/api/gallery/albums",
            json={"title": "", "privacy": "PUBLIC"},
            headers=auth_headers,
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_list_albums(self, client: AsyncClient, auth_headers: dict):
        """Should list user's albums"""
        response = await client.get(
            "/api/gallery/albums",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data

    @pytest.mark.asyncio
    async def test_get_nonexistent_album(self, client: AsyncClient, auth_headers: dict):
        """Should return 404 for nonexistent album"""
        fake_id = str(uuid.uuid4())

        response = await client.get(
            f"/api/gallery/albums/{fake_id}",
            headers=auth_headers,
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_album(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Should return 404 when deleting nonexistent album"""
        fake_id = str(uuid.uuid4())

        response = await client.delete(
            f"/api/gallery/albums/{fake_id}",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestAlbumSharing:
    """Tests for album sharing functionality"""

    @pytest.mark.asyncio
    async def test_share_nonexistent_album(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Should return 404 when sharing nonexistent album"""
        fake_id = str(uuid.uuid4())

        response = await client.post(
            f"/api/gallery/albums/{fake_id}/share",
            json={"expires_in_days": 7},
            headers=auth_headers,
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_access_invalid_share_token(self, client: AsyncClient):
        """Should return 404 for invalid share token"""
        response = await client.get("/api/gallery/albums/shared/invalid-token")

        assert response.status_code == 404


class TestPrivacy:
    """Tests for privacy enforcement"""

    @pytest.mark.asyncio
    async def test_update_media_privacy(
        self, client: AsyncClient, auth_headers: dict, mock_storage
    ):
        """Should update media privacy"""
        # First upload
        files = {"file": ("test.jpg", io.BytesIO(b"content" * 100), "image/jpeg")}
        upload_response = await client.post(
            "/api/gallery/upload",
            files=files,
            headers=auth_headers,
        )

        if upload_response.status_code == 200:
            media_id = upload_response.json()["id"]

            # Update privacy
            response = await client.patch(
                f"/api/gallery/{media_id}",
                json={"privacy": "FRIENDS_ONLY"},
                headers=auth_headers,
            )

            assert response.status_code == 200
            assert response.json()["privacy"] == "FRIENDS_ONLY"
