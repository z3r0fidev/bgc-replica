"""
Media Processor Service

Handles image processing, thumbnail generation, and metadata extraction.
Spec 010 - Media Gallery & Albums
"""

from typing import Optional, Tuple
from io import BytesIO
import subprocess
import tempfile
import os
import json

try:
    from PIL import Image

    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


# Check if ffmpeg is available
def check_ffmpeg() -> bool:
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        return False


FFMPEG_AVAILABLE = check_ffmpeg()


class MediaProcessor:
    """Service for processing uploaded media files."""

    THUMBNAIL_SIZE = (300, 300)
    SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    SUPPORTED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}

    # Magic bytes for file type verification
    MAGIC_BYTES = {
        "image/jpeg": [b"\xff\xd8\xff"],
        "image/png": [b"\x89PNG\r\n\x1a\n"],
        "image/webp": [b"RIFF"],  # RIFF....WEBP
        "image/gif": [b"GIF87a", b"GIF89a"],
        "video/mp4": [b"\x00\x00\x00", b"ftyp"],  # Can start with size or ftyp
        "video/webm": [b"\x1a\x45\xdf\xa3"],
        "video/quicktime": [b"\x00\x00\x00", b"ftyp"],
    }

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

    def __init__(self):
        self.pil_available = PIL_AVAILABLE
        self.ffmpeg_available = FFMPEG_AVAILABLE

    def is_supported_type(self, content_type: str) -> bool:
        """Check if the content type is supported."""
        return (
            content_type in self.SUPPORTED_IMAGE_TYPES
            or content_type in self.SUPPORTED_VIDEO_TYPES
        )

    def is_image(self, content_type: str) -> bool:
        """Check if content type is an image."""
        return content_type in self.SUPPORTED_IMAGE_TYPES

    def is_video(self, content_type: str) -> bool:
        """Check if content type is a video."""
        return content_type in self.SUPPORTED_VIDEO_TYPES

    def validate_magic_bytes(self, content: bytes, claimed_type: str) -> bool:
        """
        Verify file content matches claimed MIME type using magic bytes.
        Returns True if the file's magic bytes match the expected type.
        """
        if claimed_type not in self.MAGIC_BYTES:
            return False

        magic_patterns = self.MAGIC_BYTES[claimed_type]

        # Check for WebP which has RIFF....WEBP pattern
        if claimed_type == "image/webp":
            if len(content) < 12:
                return False
            return content[:4] == b"RIFF" and content[8:12] == b"WEBP"

        # Check for MP4/QuickTime which can have various headers
        if claimed_type in ("video/mp4", "video/quicktime"):
            if len(content) < 12:
                return False
            # Check for ftyp box (common MP4/MOV pattern)
            return content[4:8] == b"ftyp" or content[:3] == b"\x00\x00\x00"

        # Standard magic byte check for other types
        for pattern in magic_patterns:
            if content[: len(pattern)] == pattern:
                return True

        return False

    def get_safe_extension(self, content_type: str) -> str:
        """Get safe file extension from validated content type."""
        return self.EXTENSION_MAP.get(content_type, "bin")

    def validate_upload(
        self, content: bytes, claimed_type: str
    ) -> Tuple[bool, str]:
        """
        Comprehensive upload validation: type, size, and magic bytes.
        Returns (is_valid, error_message).
        """
        # Check if type is supported
        if not self.is_supported_type(claimed_type):
            return False, f"File type '{claimed_type}' is not allowed"

        # Check file size
        is_valid_size, size_error = self.validate_file_size(content, claimed_type)
        if not is_valid_size:
            return False, size_error

        # Verify magic bytes match claimed type
        if not self.validate_magic_bytes(content, claimed_type):
            return False, "File content does not match claimed type"

        return True, ""

    def get_media_type(self, content_type: str) -> str:
        """Return 'IMAGE' or 'VIDEO' based on content type."""
        if self.is_image(content_type):
            return "IMAGE"
        elif self.is_video(content_type):
            return "VIDEO"
        return "UNKNOWN"

    def get_image_dimensions(
        self, file_content: bytes
    ) -> Tuple[Optional[int], Optional[int]]:
        """Extract width and height from an image."""
        if not self.pil_available:
            return None, None

        try:
            img = Image.open(BytesIO(file_content))
            return img.width, img.height
        except Exception:
            return None, None

    def generate_thumbnail(
        self, file_content: bytes, content_type: str
    ) -> Optional[bytes]:
        """
        Generate a WebP thumbnail for an image or video.
        Returns the thumbnail bytes or None if generation fails.
        """
        if self.is_video(content_type):
            return self.generate_video_thumbnail(file_content, content_type)

        if not self.pil_available:
            return None

        if not self.is_image(content_type):
            return None

        try:
            img = Image.open(BytesIO(file_content))

            # Convert to RGB if necessary (for PNG with alpha, etc.)
            if img.mode in ("RGBA", "LA", "P"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                background.paste(
                    img, mask=img.split()[-1] if img.mode == "RGBA" else None
                )
                img = background

            # Create thumbnail maintaining aspect ratio
            img.thumbnail(self.THUMBNAIL_SIZE, Image.Resampling.LANCZOS)

            # Save as WebP
            output = BytesIO()
            img.save(output, format="WEBP", quality=80)
            output.seek(0)

            return output.read()

        except Exception as e:
            print(f"Thumbnail generation failed: {e}")
            return None

    def strip_exif(self, file_content: bytes, content_type: str) -> bytes:
        """
        Strip EXIF metadata from images for privacy.
        Returns the image bytes without EXIF data.
        """
        if not self.pil_available or not self.is_image(content_type):
            return file_content

        try:
            img = Image.open(BytesIO(file_content))

            # Create a new image without EXIF
            data = list(img.getdata())
            img_no_exif = Image.new(img.mode, img.size)
            img_no_exif.putdata(data)

            # Save to bytes
            output = BytesIO()
            format_map = {
                "image/jpeg": "JPEG",
                "image/png": "PNG",
                "image/webp": "WEBP",
                "image/gif": "GIF",
            }
            img_format = format_map.get(content_type, "JPEG")
            img_no_exif.save(output, format=img_format, quality=95)
            output.seek(0)

            return output.read()

        except Exception:
            # If stripping fails, return original
            return file_content

    def validate_file_size(self, content: bytes, content_type: str) -> Tuple[bool, str]:
        """
        Validate file size based on type.
        Returns (is_valid, error_message).
        """
        MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
        MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB

        size = len(content)

        if self.is_image(content_type):
            if size > MAX_IMAGE_SIZE:
                return (
                    False,
                    f"Image too large. Maximum size is {MAX_IMAGE_SIZE // (1024*1024)}MB",
                )
        elif self.is_video(content_type):
            if size > MAX_VIDEO_SIZE:
                return (
                    False,
                    f"Video too large. Maximum size is {MAX_VIDEO_SIZE // (1024*1024)}MB",
                )
        else:
            return False, f"Unsupported file type: {content_type}"

        return True, ""

    def generate_video_thumbnail(
        self, file_content: bytes, content_type: str
    ) -> Optional[bytes]:
        """
        Generate a WebP thumbnail from a video using ffmpeg.
        Extracts a frame from 1 second into the video.
        """
        if not self.ffmpeg_available or not self.pil_available:
            return None

        try:
            # Write video to temp file
            ext_map = {
                "video/mp4": ".mp4",
                "video/webm": ".webm",
                "video/quicktime": ".mov",
            }
            ext = ext_map.get(content_type, ".mp4")

            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as video_file:
                video_file.write(file_content)
                video_path = video_file.name

            # Output thumbnail path
            thumb_path = video_path + "_thumb.jpg"

            try:
                # Extract frame at 1 second (or first frame if video is shorter)
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-i",
                        video_path,
                        "-ss",
                        "00:00:01",
                        "-vframes",
                        "1",
                        "-q:v",
                        "2",
                        thumb_path,
                    ],
                    capture_output=True,
                    check=True,
                    timeout=30,
                )

                # Read and convert to WebP
                if os.path.exists(thumb_path):
                    img = Image.open(thumb_path)
                    img.thumbnail(self.THUMBNAIL_SIZE, Image.Resampling.LANCZOS)

                    output = BytesIO()
                    img.save(output, format="WEBP", quality=80)
                    output.seek(0)
                    return output.read()

            finally:
                # Cleanup temp files
                if os.path.exists(video_path):
                    os.unlink(video_path)
                if os.path.exists(thumb_path):
                    os.unlink(thumb_path)

        except Exception as e:
            print(f"Video thumbnail generation failed: {e}")

        return None

    def get_video_duration(
        self, file_content: bytes, content_type: str
    ) -> Optional[int]:
        """
        Get video duration in seconds using ffprobe.
        """
        if not self.ffmpeg_available:
            return None

        try:
            ext_map = {
                "video/mp4": ".mp4",
                "video/webm": ".webm",
                "video/quicktime": ".mov",
            }
            ext = ext_map.get(content_type, ".mp4")

            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as video_file:
                video_file.write(file_content)
                video_path = video_file.name

            try:
                result = subprocess.run(
                    [
                        "ffprobe",
                        "-v",
                        "error",
                        "-show_entries",
                        "format=duration",
                        "-of",
                        "json",
                        video_path,
                    ],
                    capture_output=True,
                    text=True,
                    check=True,
                    timeout=30,
                )

                data = json.loads(result.stdout)
                duration = float(data["format"]["duration"])
                return int(duration)

            finally:
                if os.path.exists(video_path):
                    os.unlink(video_path)

        except Exception as e:
            print(f"Video duration extraction failed: {e}")

        return None

    def get_video_dimensions(
        self, file_content: bytes, content_type: str
    ) -> Tuple[Optional[int], Optional[int]]:
        """
        Get video width and height using ffprobe.
        """
        if not self.ffmpeg_available:
            return None, None

        try:
            ext_map = {
                "video/mp4": ".mp4",
                "video/webm": ".webm",
                "video/quicktime": ".mov",
            }
            ext = ext_map.get(content_type, ".mp4")

            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as video_file:
                video_file.write(file_content)
                video_path = video_file.name

            try:
                result = subprocess.run(
                    [
                        "ffprobe",
                        "-v",
                        "error",
                        "-select_streams",
                        "v:0",
                        "-show_entries",
                        "stream=width,height",
                        "-of",
                        "json",
                        video_path,
                    ],
                    capture_output=True,
                    text=True,
                    check=True,
                    timeout=30,
                )

                data = json.loads(result.stdout)
                if data.get("streams"):
                    stream = data["streams"][0]
                    return stream.get("width"), stream.get("height")

            finally:
                if os.path.exists(video_path):
                    os.unlink(video_path)

        except Exception as e:
            print(f"Video dimensions extraction failed: {e}")

        return None, None


# Singleton instance
media_processor = MediaProcessor()
