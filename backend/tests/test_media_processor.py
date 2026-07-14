import json
import subprocess
from io import BytesIO
from unittest.mock import MagicMock

from PIL import Image

from app.services.media_processor import media_processor


def _make_image_bytes(fmt: str, size=(50, 50), mode="RGB", color=(255, 0, 0)) -> bytes:
    img = Image.new(mode, size, color)
    buffer = BytesIO()
    img.save(buffer, format=fmt)
    return buffer.getvalue()


JPEG_BYTES = _make_image_bytes("JPEG")
PNG_BYTES = _make_image_bytes("PNG")
WEBP_BYTES = _make_image_bytes("WEBP")
GIF_BYTES = _make_image_bytes("GIF")
RGBA_PNG_BYTES = _make_image_bytes("PNG", mode="RGBA", color=(255, 0, 0, 128))


class TestIsSupportedType:
    def test_supported_image_type(self):
        assert media_processor.is_supported_type("image/jpeg") is True

    def test_supported_video_type(self):
        assert media_processor.is_supported_type("video/mp4") is True

    def test_unsupported_type(self):
        assert media_processor.is_supported_type("application/pdf") is False


class TestIsImageIsVideo:
    def test_is_image_true_for_image_type(self):
        assert media_processor.is_image("image/png") is True

    def test_is_image_false_for_video_type(self):
        assert media_processor.is_image("video/mp4") is False

    def test_is_video_true_for_video_type(self):
        assert media_processor.is_video("video/webm") is True

    def test_is_video_false_for_image_type(self):
        assert media_processor.is_video("image/png") is False


class TestGetSafeExtension:
    def test_known_type_returns_mapped_extension(self):
        assert media_processor.get_safe_extension("image/png") == "png"
        assert media_processor.get_safe_extension("video/quicktime") == "mov"

    def test_unknown_type_returns_bin(self):
        assert media_processor.get_safe_extension("application/pdf") == "bin"


class TestGetMediaType:
    def test_image_returns_image(self):
        assert media_processor.get_media_type("image/jpeg") == "IMAGE"

    def test_video_returns_video(self):
        assert media_processor.get_media_type("video/mp4") == "VIDEO"

    def test_unknown_returns_unknown(self):
        assert media_processor.get_media_type("application/pdf") == "UNKNOWN"


class TestValidateMagicBytes:
    def test_unsupported_claimed_type_returns_false(self):
        assert media_processor.validate_magic_bytes(b"anything", "application/pdf") is False

    def test_jpeg_valid_magic_bytes(self):
        assert media_processor.validate_magic_bytes(JPEG_BYTES, "image/jpeg") is True

    def test_png_valid_magic_bytes(self):
        assert media_processor.validate_magic_bytes(PNG_BYTES, "image/png") is True

    def test_gif87a_valid(self):
        assert media_processor.validate_magic_bytes(b"GIF87a rest", "image/gif") is True

    def test_gif89a_valid(self):
        assert media_processor.validate_magic_bytes(GIF_BYTES, "image/gif") is True

    def test_webp_valid_riff_webp_pattern(self):
        assert media_processor.validate_magic_bytes(WEBP_BYTES, "image/webp") is True

    def test_webp_too_short_returns_false(self):
        assert media_processor.validate_magic_bytes(b"RIFF", "image/webp") is False

    def test_webp_wrong_pattern_returns_false(self):
        content = b"RIFF" + b"\x00" * 4 + b"AVI " + b"\x00" * 10
        assert media_processor.validate_magic_bytes(content, "image/webp") is False

    def test_mp4_ftyp_box_valid(self):
        content = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 10
        assert media_processor.validate_magic_bytes(content, "video/mp4") is True

    def test_mp4_too_short_returns_false(self):
        assert media_processor.validate_magic_bytes(b"\x00\x00", "video/mp4") is False

    def test_mp4_garbage_returns_false(self):
        content = b"NOTAVALIDHEADERATALL"
        assert media_processor.validate_magic_bytes(content, "video/mp4") is False

    def test_mismatched_content_returns_false(self):
        assert media_processor.validate_magic_bytes(PNG_BYTES, "image/jpeg") is False


class TestValidateFileSize:
    def test_image_within_limit(self):
        is_valid, error = media_processor.validate_file_size(b"x" * 100, "image/jpeg")
        assert is_valid is True
        assert error == ""

    def test_image_exceeds_limit(self):
        content = b"x" * (10 * 1024 * 1024 + 1)
        is_valid, error = media_processor.validate_file_size(content, "image/jpeg")
        assert is_valid is False
        assert "too large" in error.lower()

    def test_video_within_limit(self):
        is_valid, error = media_processor.validate_file_size(b"x" * 100, "video/mp4")
        assert is_valid is True

    def test_video_exceeds_limit(self):
        content = b"x" * (100 * 1024 * 1024 + 1)
        is_valid, error = media_processor.validate_file_size(content, "video/mp4")
        assert is_valid is False
        assert "too large" in error.lower()

    def test_unsupported_type_returns_false(self):
        is_valid, error = media_processor.validate_file_size(b"x", "application/pdf")
        assert is_valid is False
        assert "unsupported" in error.lower()


class TestValidateUpload:
    def test_unsupported_type_rejected(self):
        is_valid, error = media_processor.validate_upload(b"x", "application/pdf")
        assert is_valid is False
        assert "not allowed" in error

    def test_wrong_magic_bytes_rejected(self):
        is_valid, error = media_processor.validate_upload(b"not a real jpeg", "image/jpeg")
        assert is_valid is False
        assert "does not match" in error

    def test_oversized_file_rejected(self):
        content = b"\xff\xd8\xff" + b"x" * (10 * 1024 * 1024 + 1)
        is_valid, error = media_processor.validate_upload(content, "image/jpeg")
        assert is_valid is False
        assert "too large" in error.lower()

    def test_valid_upload_accepted(self):
        is_valid, error = media_processor.validate_upload(JPEG_BYTES, "image/jpeg")
        assert is_valid is True
        assert error == ""


class TestGetImageDimensions:
    def test_returns_correct_dimensions(self):
        content = _make_image_bytes("PNG", size=(80, 40))

        width, height = media_processor.get_image_dimensions(content)

        assert (width, height) == (80, 40)

    def test_pil_unavailable_returns_none_none(self, monkeypatch):
        monkeypatch.setattr(media_processor, "pil_available", False)

        assert media_processor.get_image_dimensions(PNG_BYTES) == (None, None)

    def test_corrupt_content_returns_none_none(self):
        assert media_processor.get_image_dimensions(b"not an image") == (None, None)


class TestGenerateThumbnail:
    def test_generates_webp_thumbnail_for_image(self):
        thumb = media_processor.generate_thumbnail(JPEG_BYTES, "image/jpeg")

        assert thumb is not None
        img = Image.open(BytesIO(thumb))
        assert img.format == "WEBP"
        assert img.width <= media_processor.THUMBNAIL_SIZE[0]
        assert img.height <= media_processor.THUMBNAIL_SIZE[1]

    def test_handles_rgba_png_by_flattening_to_rgb(self):
        thumb = media_processor.generate_thumbnail(RGBA_PNG_BYTES, "image/png")

        assert thumb is not None
        img = Image.open(BytesIO(thumb))
        assert img.format == "WEBP"

    def test_handles_palette_mode_gif_by_flattening_to_rgb(self):
        # GIFs decode to PIL mode "P" (palette-indexed), a separate branch
        # from RGBA/LA that first converts to RGBA before flattening.
        assert Image.open(BytesIO(GIF_BYTES)).mode == "P"

        thumb = media_processor.generate_thumbnail(GIF_BYTES, "image/gif")

        assert thumb is not None
        img = Image.open(BytesIO(thumb))
        assert img.format == "WEBP"

    def test_video_type_delegates_to_generate_video_thumbnail(self, monkeypatch):
        called = {}

        def fake_video_thumb(content, content_type):
            called["args"] = (content, content_type)
            return b"fake-thumb-bytes"

        monkeypatch.setattr(
            media_processor, "generate_video_thumbnail", fake_video_thumb
        )

        result = media_processor.generate_thumbnail(b"video bytes", "video/mp4")

        assert result == b"fake-thumb-bytes"
        assert called["args"] == (b"video bytes", "video/mp4")

    def test_pil_unavailable_returns_none(self, monkeypatch):
        monkeypatch.setattr(media_processor, "pil_available", False)

        assert media_processor.generate_thumbnail(JPEG_BYTES, "image/jpeg") is None

    def test_unsupported_content_type_returns_none(self):
        assert media_processor.generate_thumbnail(JPEG_BYTES, "application/pdf") is None

    def test_corrupt_image_returns_none(self):
        assert media_processor.generate_thumbnail(b"not an image", "image/jpeg") is None


class TestStripExif:
    def test_returns_reencoded_decodable_jpeg(self):
        result = media_processor.strip_exif(JPEG_BYTES, "image/jpeg")

        img = Image.open(BytesIO(result))
        assert img.format == "JPEG"

    def test_pil_unavailable_returns_original(self, monkeypatch):
        monkeypatch.setattr(media_processor, "pil_available", False)

        assert media_processor.strip_exif(JPEG_BYTES, "image/jpeg") == JPEG_BYTES

    def test_non_image_type_returns_original(self):
        content = b"video bytes"
        assert media_processor.strip_exif(content, "video/mp4") == content

    def test_corrupt_content_returns_original(self):
        content = b"not an image"
        assert media_processor.strip_exif(content, "image/jpeg") == content


class TestGenerateVideoThumbnail:
    def test_ffmpeg_unavailable_returns_none(self, monkeypatch):
        monkeypatch.setattr(media_processor, "ffmpeg_available", False)

        assert media_processor.generate_video_thumbnail(b"video", "video/mp4") is None

    def test_pil_unavailable_returns_none(self, monkeypatch):
        monkeypatch.setattr(media_processor, "ffmpeg_available", True)
        monkeypatch.setattr(media_processor, "pil_available", False)

        assert media_processor.generate_video_thumbnail(b"video", "video/mp4") is None

    def test_successful_extraction_returns_webp_bytes(self, monkeypatch):
        monkeypatch.setattr(media_processor, "ffmpeg_available", True)
        monkeypatch.setattr(media_processor, "pil_available", True)

        def fake_run(cmd, **kwargs):
            # cmd is [..., thumb_path] - the last argument is the output path
            # ffmpeg would write to. Write a real JPEG there so the code's
            # subsequent Image.open(thumb_path) succeeds like it would
            # against real ffmpeg output.
            thumb_path = cmd[-1]
            with open(thumb_path, "wb") as f:
                f.write(_make_image_bytes("JPEG", size=(64, 64)))
            return MagicMock(returncode=0)

        monkeypatch.setattr(subprocess, "run", fake_run)

        result = media_processor.generate_video_thumbnail(b"video bytes", "video/mp4")

        assert result is not None
        img = Image.open(BytesIO(result))
        assert img.format == "WEBP"

    def test_ffmpeg_failure_returns_none(self, monkeypatch):
        monkeypatch.setattr(media_processor, "ffmpeg_available", True)
        monkeypatch.setattr(media_processor, "pil_available", True)

        def fake_run(cmd, **kwargs):
            raise subprocess.CalledProcessError(1, cmd)

        monkeypatch.setattr(subprocess, "run", fake_run)

        result = media_processor.generate_video_thumbnail(b"video bytes", "video/mp4")

        assert result is None

    def test_ffmpeg_timeout_returns_none(self, monkeypatch):
        monkeypatch.setattr(media_processor, "ffmpeg_available", True)
        monkeypatch.setattr(media_processor, "pil_available", True)

        def fake_run(cmd, **kwargs):
            raise subprocess.TimeoutExpired(cmd, 30)

        monkeypatch.setattr(subprocess, "run", fake_run)

        result = media_processor.generate_video_thumbnail(b"video bytes", "video/mp4")

        assert result is None


class TestGetVideoDuration:
    def test_ffmpeg_unavailable_returns_none(self, monkeypatch):
        monkeypatch.setattr(media_processor, "ffmpeg_available", False)

        assert media_processor.get_video_duration(b"video", "video/mp4") is None

    def test_successful_probe_returns_duration(self, monkeypatch):
        monkeypatch.setattr(media_processor, "ffmpeg_available", True)

        def fake_run(cmd, **kwargs):
            return MagicMock(
                stdout=json.dumps({"format": {"duration": "12.75"}}), returncode=0
            )

        monkeypatch.setattr(subprocess, "run", fake_run)

        duration = media_processor.get_video_duration(b"video bytes", "video/mp4")

        assert duration == 12

    def test_ffprobe_failure_returns_none(self, monkeypatch):
        monkeypatch.setattr(media_processor, "ffmpeg_available", True)

        def fake_run(cmd, **kwargs):
            raise subprocess.CalledProcessError(1, cmd)

        monkeypatch.setattr(subprocess, "run", fake_run)

        assert media_processor.get_video_duration(b"video bytes", "video/mp4") is None


class TestGetVideoDimensions:
    def test_ffmpeg_unavailable_returns_none_none(self, monkeypatch):
        monkeypatch.setattr(media_processor, "ffmpeg_available", False)

        assert media_processor.get_video_dimensions(b"video", "video/mp4") == (None, None)

    def test_successful_probe_returns_dimensions(self, monkeypatch):
        monkeypatch.setattr(media_processor, "ffmpeg_available", True)

        def fake_run(cmd, **kwargs):
            return MagicMock(
                stdout=json.dumps({"streams": [{"width": 1920, "height": 1080}]}),
                returncode=0,
            )

        monkeypatch.setattr(subprocess, "run", fake_run)

        dimensions = media_processor.get_video_dimensions(b"video bytes", "video/mp4")

        assert dimensions == (1920, 1080)

    def test_no_streams_returns_none_none(self, monkeypatch):
        monkeypatch.setattr(media_processor, "ffmpeg_available", True)

        def fake_run(cmd, **kwargs):
            return MagicMock(stdout=json.dumps({"streams": []}), returncode=0)

        monkeypatch.setattr(subprocess, "run", fake_run)

        assert media_processor.get_video_dimensions(b"video bytes", "video/mp4") == (
            None,
            None,
        )

    def test_ffprobe_failure_returns_none_none(self, monkeypatch):
        monkeypatch.setattr(media_processor, "ffmpeg_available", True)

        def fake_run(cmd, **kwargs):
            raise subprocess.CalledProcessError(1, cmd)

        monkeypatch.setattr(subprocess, "run", fake_run)

        assert media_processor.get_video_dimensions(b"video bytes", "video/mp4") == (
            None,
            None,
        )
