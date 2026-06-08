from typing import Optional
from supabase import create_client, Client
from app.core.config import settings
import uuid


class StorageService:
    def __init__(self):
        self.supabase: Optional[Client] = None
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            try:
                self.supabase = create_client(
                    settings.SUPABASE_URL, settings.SUPABASE_KEY
                )
            except Exception:
                pass
        self.bucket_name = settings.MEDIA_BUCKET_NAME

    # Safe extension mapping from content type
    EXTENSION_MAP = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/quicktime": "mov",
    }

    ALLOWED_TYPES = {
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "video/mp4", "video/webm", "video/quicktime",
    }

    async def upload_file(
        self, file_content: bytes, filename: str, content_type: str
    ) -> dict:
        """
        Uploads a file to Supabase Storage and returns the public URL.
        Filename should already be sanitized (UUID-based) by the caller.
        """
        if not self.supabase:
            raise Exception("Supabase client not initialized. Check credentials.")

        # Validate content type is allowed
        if content_type not in self.ALLOWED_TYPES:
            raise ValueError(f"Content type '{content_type}' is not allowed")

        # Use content-type to determine extension as fallback if filename has none
        if "." in filename:
            ext = filename.rsplit(".", 1)[-1]
        else:
            ext = self.EXTENSION_MAP.get(content_type, "bin")

        unique_name = f"{uuid.uuid4()}.{ext}"
        path = f"media/{unique_name}"

        self.supabase.storage.from_(self.bucket_name).upload(
            path=path,
            file=file_content,
            file_options={
                "content-type": content_type,
                "upsert": "true",
                "cache-control": "31536000",  # 1 Year
            },
        )

        # In supabase-py 2.x, it usually returns the path or raises exception
        # We need the public URL
        public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(path)

        return {"url": public_url, "storage_path": path}

    async def delete_file(self, storage_path: str):
        """
        Deletes a file from Supabase Storage.
        """
        self.supabase.storage.from_(self.bucket_name).remove([storage_path])


storage_service = StorageService()
