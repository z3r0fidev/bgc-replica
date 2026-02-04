"""Tests for profile URL validation in social_links field."""

import pytest
from pydantic import ValidationError
from app.schemas.profile import ProfileUpdate


class TestSocialLinksValidation:
    """Test suite for social_links URL validation."""

    # Instagram URL tests
    def test_valid_instagram_url(self):
        """Valid Instagram URL should pass validation."""
        data = {"social_links": {"instagram_url": "https://instagram.com/testuser"}}
        profile = ProfileUpdate(**data)
        assert profile.social_links["instagram_url"] == "https://instagram.com/testuser"

    def test_valid_instagram_url_with_www(self):
        """Instagram URL with www should pass validation."""
        data = {"social_links": {"instagram_url": "https://www.instagram.com/testuser"}}
        profile = ProfileUpdate(**data)
        assert (
            profile.social_links["instagram_url"]
            == "https://www.instagram.com/testuser"
        )

    def test_valid_instagram_url_with_trailing_slash(self):
        """Instagram URL with trailing slash should pass validation."""
        data = {"social_links": {"instagram_url": "https://instagram.com/testuser/"}}
        profile = ProfileUpdate(**data)
        assert (
            profile.social_links["instagram_url"] == "https://instagram.com/testuser/"
        )

    def test_invalid_instagram_url_http(self):
        """Instagram URL with HTTP should fail validation."""
        data = {"social_links": {"instagram_url": "http://instagram.com/testuser"}}
        with pytest.raises(ValidationError) as exc_info:
            ProfileUpdate(**data)
        assert "must use HTTPS" in str(exc_info.value)

    def test_invalid_instagram_url_wrong_domain(self):
        """Instagram URL with wrong domain should fail validation."""
        data = {"social_links": {"instagram_url": "https://twitter.com/testuser"}}
        with pytest.raises(ValidationError) as exc_info:
            ProfileUpdate(**data)
        assert "Invalid" in str(exc_info.value)

    # X/Twitter URL tests
    def test_valid_x_url_twitter_domain(self):
        """X URL with twitter.com domain should pass validation."""
        data = {"social_links": {"x_url": "https://twitter.com/testuser"}}
        profile = ProfileUpdate(**data)
        assert profile.social_links["x_url"] == "https://twitter.com/testuser"

    def test_valid_x_url_x_domain(self):
        """X URL with x.com domain should pass validation."""
        data = {"social_links": {"x_url": "https://x.com/testuser"}}
        profile = ProfileUpdate(**data)
        assert profile.social_links["x_url"] == "https://x.com/testuser"

    def test_valid_x_url_with_www(self):
        """X URL with www should pass validation."""
        data = {"social_links": {"x_url": "https://www.x.com/testuser"}}
        profile = ProfileUpdate(**data)
        assert profile.social_links["x_url"] == "https://www.x.com/testuser"

    def test_invalid_x_url_http(self):
        """X URL with HTTP should fail validation."""
        data = {"social_links": {"x_url": "http://x.com/testuser"}}
        with pytest.raises(ValidationError) as exc_info:
            ProfileUpdate(**data)
        assert "must use HTTPS" in str(exc_info.value)

    def test_invalid_x_url_wrong_domain(self):
        """X URL with wrong domain should fail validation."""
        data = {"social_links": {"x_url": "https://instagram.com/testuser"}}
        with pytest.raises(ValidationError) as exc_info:
            ProfileUpdate(**data)
        assert "Invalid" in str(exc_info.value)

    # TikTok URL tests
    def test_valid_tiktok_url(self):
        """Valid TikTok URL should pass validation."""
        data = {"social_links": {"tiktok_url": "https://tiktok.com/@testuser"}}
        profile = ProfileUpdate(**data)
        assert profile.social_links["tiktok_url"] == "https://tiktok.com/@testuser"

    def test_valid_tiktok_url_with_www(self):
        """TikTok URL with www should pass validation."""
        data = {"social_links": {"tiktok_url": "https://www.tiktok.com/@testuser"}}
        profile = ProfileUpdate(**data)
        assert profile.social_links["tiktok_url"] == "https://www.tiktok.com/@testuser"

    def test_invalid_tiktok_url_missing_at_symbol(self):
        """TikTok URL without @ symbol should fail validation."""
        data = {"social_links": {"tiktok_url": "https://tiktok.com/testuser"}}
        with pytest.raises(ValidationError) as exc_info:
            ProfileUpdate(**data)
        assert "Invalid" in str(exc_info.value)

    def test_invalid_tiktok_url_http(self):
        """TikTok URL with HTTP should fail validation."""
        data = {"social_links": {"tiktok_url": "http://tiktok.com/@testuser"}}
        with pytest.raises(ValidationError) as exc_info:
            ProfileUpdate(**data)
        assert "must use HTTPS" in str(exc_info.value)

    # Website URL tests
    def test_valid_website_url(self):
        """Valid website URL should pass validation."""
        data = {"social_links": {"website_url": "https://myportfolio.com"}}
        profile = ProfileUpdate(**data)
        assert profile.social_links["website_url"] == "https://myportfolio.com"

    def test_valid_website_url_with_path(self):
        """Website URL with path should pass validation."""
        data = {"social_links": {"website_url": "https://myportfolio.com/about"}}
        profile = ProfileUpdate(**data)
        assert profile.social_links["website_url"] == "https://myportfolio.com/about"

    def test_valid_website_url_with_subdomain(self):
        """Website URL with subdomain should pass validation."""
        data = {"social_links": {"website_url": "https://blog.myportfolio.com"}}
        profile = ProfileUpdate(**data)
        assert profile.social_links["website_url"] == "https://blog.myportfolio.com"

    def test_invalid_website_url_http(self):
        """Website URL with HTTP should fail validation."""
        data = {"social_links": {"website_url": "http://myportfolio.com"}}
        with pytest.raises(ValidationError) as exc_info:
            ProfileUpdate(**data)
        assert "must use HTTPS" in str(exc_info.value)

    def test_invalid_website_url_no_tld(self):
        """Website URL without TLD should fail validation."""
        data = {"social_links": {"website_url": "https://localhost"}}
        with pytest.raises(ValidationError) as exc_info:
            ProfileUpdate(**data)
        assert (
            "Invalid" in str(exc_info.value) or "website" in str(exc_info.value).lower()
        )

    # Multiple social links tests
    def test_multiple_valid_social_links(self):
        """Multiple valid social links should pass validation."""
        data = {
            "social_links": {
                "instagram_url": "https://instagram.com/testuser",
                "x_url": "https://x.com/testuser",
                "tiktok_url": "https://tiktok.com/@testuser",
                "website_url": "https://mysite.com",
            }
        }
        profile = ProfileUpdate(**data)
        assert profile.social_links["instagram_url"] == "https://instagram.com/testuser"
        assert profile.social_links["x_url"] == "https://x.com/testuser"
        assert profile.social_links["tiktok_url"] == "https://tiktok.com/@testuser"
        assert profile.social_links["website_url"] == "https://mysite.com"

    def test_empty_social_links(self):
        """Empty social links should pass validation."""
        data = {"social_links": {}}
        profile = ProfileUpdate(**data)
        assert profile.social_links == {}

    def test_none_social_links(self):
        """None social links should pass validation."""
        data = {"social_links": None}
        profile = ProfileUpdate(**data)
        assert profile.social_links is None

    def test_partial_social_links(self):
        """Only some social links provided should pass validation."""
        data = {
            "social_links": {
                "instagram_url": "https://instagram.com/testuser",
            }
        }
        profile = ProfileUpdate(**data)
        assert profile.social_links["instagram_url"] == "https://instagram.com/testuser"
        assert "x_url" not in profile.social_links

    def test_empty_string_url_passes(self):
        """Empty string URL should pass (filtered out by frontend)."""
        data = {"social_links": {"instagram_url": ""}}
        # Empty strings are allowed - they're filtered at form submission
        profile = ProfileUpdate(**data)
        assert profile.social_links["instagram_url"] == ""
