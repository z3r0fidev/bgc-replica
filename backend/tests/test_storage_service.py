from unittest.mock import MagicMock

import pytest

from app.core.config import settings
from app.services.storage import StorageService, storage_service


async def _upload(*args, **kwargs):
    """Calls the real (unpatched) StorageService.upload_file on the
    session-wide storage_service singleton. conftest.py's autouse
    mock_storage_upload fixture replaces storage_service.upload_file with an
    instance-level mock for the whole test session, so going through the
    class attribute directly is what bypasses that mock and exercises the
    real implementation here."""
    return await StorageService.upload_file(storage_service, *args, **kwargs)


async def _delete(*args, **kwargs):
    return await StorageService.delete_file(storage_service, *args, **kwargs)


class TestStorageServiceInit:
    def test_client_creation_failure_leaves_supabase_none(self, monkeypatch):
        monkeypatch.setattr(settings, "SUPABASE_URL", "https://example.supabase.co")
        monkeypatch.setattr(settings, "SUPABASE_KEY", "fake-key")

        def _broken_create_client(url, key):
            raise RuntimeError("network unreachable")

        monkeypatch.setattr("app.services.storage.create_client", _broken_create_client)

        service = StorageService()

        assert service.supabase is None


class TestUploadFileWithoutClient:
    @pytest.mark.asyncio
    async def test_raises_when_supabase_not_configured(self, monkeypatch):
        monkeypatch.setattr(storage_service, "supabase", None)

        with pytest.raises(Exception, match="Supabase client not initialized"):
            await _upload(b"data", "photo.jpg", "image/jpeg")


class TestUploadFileValidation:
    @pytest.mark.asyncio
    async def test_disallowed_content_type_raises_before_touching_client(
        self, monkeypatch
    ):
        mock_client = MagicMock()
        monkeypatch.setattr(storage_service, "supabase", mock_client)

        with pytest.raises(ValueError, match="not allowed"):
            await _upload(b"data", "file.exe", "application/x-msdownload")

        mock_client.storage.from_.assert_not_called()


class TestUploadFileSuccess:
    @pytest.mark.asyncio
    async def test_uses_extension_from_filename_when_present(self, monkeypatch):
        mock_client = MagicMock()
        mock_client.storage.from_.return_value.get_public_url.return_value = (
            "https://storage.example.com/media/x.png"
        )
        monkeypatch.setattr(storage_service, "supabase", mock_client)

        result = await _upload(b"data", "photo.png", "image/png")

        upload_call = mock_client.storage.from_.return_value.upload.call_args
        assert upload_call.kwargs["path"].endswith(".png")
        assert upload_call.kwargs["file"] == b"data"
        assert upload_call.kwargs["file_options"]["content-type"] == "image/png"
        assert result["storage_path"].endswith(".png")

    @pytest.mark.asyncio
    async def test_falls_back_to_content_type_extension_when_filename_has_none(
        self, monkeypatch
    ):
        mock_client = MagicMock()
        mock_client.storage.from_.return_value.get_public_url.return_value = (
            "https://storage.example.com/media/x.webp"
        )
        monkeypatch.setattr(storage_service, "supabase", mock_client)

        result = await _upload(b"data", "no-extension-filename", "image/webp")

        assert result["storage_path"].endswith(".webp")

    @pytest.mark.asyncio
    async def test_returns_url_and_storage_path(self, monkeypatch):
        mock_client = MagicMock()
        mock_client.storage.from_.return_value.get_public_url.return_value = (
            "https://storage.example.com/media/generated.jpg"
        )
        monkeypatch.setattr(storage_service, "supabase", mock_client)

        result = await _upload(b"data", "photo.jpg", "image/jpeg")

        assert result == {
            "url": "https://storage.example.com/media/generated.jpg",
            "storage_path": result["storage_path"],
        }
        assert result["storage_path"].startswith("media/")

    @pytest.mark.asyncio
    async def test_uploads_to_configured_bucket(self, monkeypatch):
        mock_client = MagicMock()
        mock_client.storage.from_.return_value.get_public_url.return_value = "url"
        monkeypatch.setattr(storage_service, "supabase", mock_client)

        await _upload(b"data", "photo.jpg", "image/jpeg")

        mock_client.storage.from_.assert_any_call(storage_service.bucket_name)


class TestDeleteFile:
    @pytest.mark.asyncio
    async def test_raises_when_supabase_not_configured(self, monkeypatch):
        monkeypatch.setattr(storage_service, "supabase", None)

        with pytest.raises(Exception, match="Supabase client not initialized"):
            await _delete("media/some-file.jpg")

    @pytest.mark.asyncio
    async def test_removes_file_at_path(self, monkeypatch):
        mock_client = MagicMock()
        monkeypatch.setattr(storage_service, "supabase", mock_client)

        await _delete("media/some-file.jpg")

        mock_client.storage.from_.return_value.remove.assert_called_once_with(
            ["media/some-file.jpg"]
        )
