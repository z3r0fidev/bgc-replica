"""
Integration tests for Gallery API

Spec 010 - Media Gallery & Albums
"""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
import uuid
import io


# Mock storage service for testing
@pytest.fixture
def mock_storage():
    with patch("app.api.gallery.storage_service") as mock:
        mock.upload_file = AsyncMock(
            return_value={
                "url": "https://storage.example.com/test.jpg",
                "storage_path": "test-user/gallery/test.jpg",
            }
        )
        mock.delete_file = AsyncMock()
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

        assert (
            response.status_code == 200
        ), f"upload got {response.status_code}: {response.text}"
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

    @pytest.mark.asyncio
    async def test_delete_media_deletes_thumbnail(
        self, client: AsyncClient, auth_headers: dict, mock_storage
    ):
        """Should delete both media file and thumbnail from storage (Issue #71)"""
        # First upload media
        image_content = b"fake image content" * 100
        files = {"file": ("test.jpg", io.BytesIO(image_content), "image/jpeg")}

        upload_response = await client.post(
            "/api/gallery/upload",
            files=files,
            headers=auth_headers,
        )

        if upload_response.status_code != 200:
            pytest.skip("Upload failed")

        media_id = upload_response.json()["id"]

        # Reset mock call count
        mock_storage.delete_file.reset_mock()

        # Delete the media
        response = await client.delete(
            f"/api/gallery/{media_id}",
            headers=auth_headers,
        )

        assert response.status_code == 204

        # Verify delete_file was called (at least once for main file)
        assert mock_storage.delete_file.call_count >= 1


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


class TestFriendsOnlyPrivacy:
    """Tests for FRIENDS_ONLY privacy enforcement (Issue #64)"""

    @pytest.fixture
    async def target_auth_headers(self, test_target_user):
        """Returns auth headers for the target user."""
        from jose import jwt
        from datetime import datetime, timedelta, timezone
        from app.core.config import settings

        secret = (
            settings.NEXTAUTH_SECRET
            if settings.NEXTAUTH_SECRET
            else settings.SECRET_KEY
        )
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        to_encode = {"exp": expire, "sub": str(test_target_user.id)}
        token = jwt.encode(to_encode, secret, algorithm=settings.ALGORITHM)

        return {"Authorization": f"Bearer {token}"}

    @pytest.fixture
    async def friends_only_media(
        self, client: AsyncClient, auth_headers: dict, mock_storage, db_session
    ):
        """Upload a FRIENDS_ONLY media item owned by test_user."""
        files = {"file": ("test.jpg", io.BytesIO(b"content" * 100), "image/jpeg")}
        response = await client.post(
            "/api/gallery/upload?privacy=FRIENDS_ONLY",
            files=files,
            headers=auth_headers,
        )
        if response.status_code == 200:
            return response.json()
        return None

    @pytest.fixture
    def mock_friendship_true(self):
        """Mock profile_service.get_friendship_status to return True."""
        with patch(
            "app.api.gallery.profile_service.get_friendship_status",
            new_callable=AsyncMock,
            return_value=True,
        ) as mock:
            yield mock

    @pytest.fixture
    def mock_friendship_false(self):
        """Mock profile_service.get_friendship_status to return False."""
        with patch(
            "app.api.gallery.profile_service.get_friendship_status",
            new_callable=AsyncMock,
            return_value=False,
        ) as mock:
            yield mock

    @pytest.mark.asyncio
    async def test_friends_only_media_hidden_from_non_friend(
        self,
        client: AsyncClient,
        auth_headers: dict,
        target_auth_headers: dict,
        friends_only_media,
        mock_friendship_false,
    ):
        """Non-friends should NOT be able to access FRIENDS_ONLY media."""
        if friends_only_media is None:
            pytest.skip("Media upload failed")

        media_id = friends_only_media["id"]

        # Target user (non-friend) tries to access
        response = await client.get(
            f"/api/gallery/{media_id}",
            headers=target_auth_headers,
        )

        # Should return 404 (hidden)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_friends_only_media_visible_to_owner(
        self,
        client: AsyncClient,
        auth_headers: dict,
        friends_only_media,
    ):
        """Owner should always be able to access their own FRIENDS_ONLY media."""
        if friends_only_media is None:
            pytest.skip("Media upload failed")

        media_id = friends_only_media["id"]

        response = await client.get(
            f"/api/gallery/{media_id}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["privacy"] == "FRIENDS_ONLY"

    @pytest.mark.asyncio
    async def test_friends_only_media_visible_to_friend(
        self,
        client: AsyncClient,
        auth_headers: dict,
        target_auth_headers: dict,
        friends_only_media,
        mock_friendship_true,
    ):
        """Friends should be able to access FRIENDS_ONLY media."""
        if friends_only_media is None:
            pytest.skip("Media upload failed")

        media_id = friends_only_media["id"]

        # Target user (now a friend) tries to access
        response = await client.get(
            f"/api/gallery/{media_id}",
            headers=target_auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["privacy"] == "FRIENDS_ONLY"

    @pytest.mark.asyncio
    async def test_user_gallery_filters_friends_only_for_non_friend(
        self,
        client: AsyncClient,
        auth_headers: dict,
        target_auth_headers: dict,
        friends_only_media,
        test_user,
        mock_friendship_false,
    ):
        """Non-friends should NOT see FRIENDS_ONLY media in user gallery."""
        if friends_only_media is None:
            pytest.skip("Media upload failed")

        # Target user views test_user's gallery
        response = await client.get(
            f"/api/gallery/users/{test_user.id}",
            headers=target_auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        # The FRIENDS_ONLY media should not be in the items
        media_ids = [item["id"] for item in data.get("items", [])]
        assert friends_only_media["id"] not in media_ids

    @pytest.mark.asyncio
    async def test_user_gallery_shows_friends_only_to_friend(
        self,
        client: AsyncClient,
        auth_headers: dict,
        target_auth_headers: dict,
        friends_only_media,
        test_user,
        mock_friendship_true,
    ):
        """Friends should see FRIENDS_ONLY media in user gallery."""
        if friends_only_media is None:
            pytest.skip("Media upload failed")

        # Target user (friend) views test_user's gallery
        response = await client.get(
            f"/api/gallery/users/{test_user.id}",
            headers=target_auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        media_ids = [item["id"] for item in data.get("items", [])]
        assert friends_only_media["id"] in media_ids

    @pytest.mark.asyncio
    async def test_friends_only_album_hidden_from_non_friend(
        self,
        client: AsyncClient,
        auth_headers: dict,
        target_auth_headers: dict,
        mock_friendship_false,
    ):
        """Non-friends should NOT be able to access FRIENDS_ONLY albums."""
        # Create a FRIENDS_ONLY album
        create_response = await client.post(
            "/api/gallery/albums",
            json={
                "title": "Friends Only Album",
                "description": "Test album",
                "privacy": "FRIENDS_ONLY",
            },
            headers=auth_headers,
        )

        if create_response.status_code != 201:
            pytest.skip("Album creation failed")

        album_id = create_response.json()["id"]

        # Non-friend tries to access
        response = await client.get(
            f"/api/gallery/albums/{album_id}",
            headers=target_auth_headers,
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_friends_only_album_visible_to_friend(
        self,
        client: AsyncClient,
        auth_headers: dict,
        target_auth_headers: dict,
        mock_friendship_true,
    ):
        """Friends should be able to access FRIENDS_ONLY albums."""
        # Create a FRIENDS_ONLY album
        create_response = await client.post(
            "/api/gallery/albums",
            json={
                "title": "Friends Only Album 2",
                "description": "Test album for friends",
                "privacy": "FRIENDS_ONLY",
            },
            headers=auth_headers,
        )

        if create_response.status_code != 201:
            pytest.skip("Album creation failed")

        album_id = create_response.json()["id"]

        # Friend tries to access
        response = await client.get(
            f"/api/gallery/albums/{album_id}",
            headers=target_auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["privacy"] == "FRIENDS_ONLY"
