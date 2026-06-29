import pytest
from httpx import AsyncClient
from datetime import date
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User


@pytest.mark.asyncio
async def test_patch_profile_identity(client: AsyncClient, auth_headers: dict):
    # Update identity fields
    payload = {
        "display_name": "Isaiah M.",
        "pronouns": "He/Him",
        "birthdate": "1990-01-01",
        "gender_identity": "Cis-male",
    }

    response = await client.patch(
        "/api/profiles/me", json=payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["display_name"] == "Isaiah M."
    assert data["pronouns"] == "He/Him"
    assert data["birthdate"] == "1990-01-01"
    assert data["gender_identity"] == "Cis-male"
    assert "age" in data
    assert data["age"] is not None


@pytest.mark.asyncio
async def test_patch_profile_age_validation(client: AsyncClient, auth_headers: dict):
    # Update with invalid age (under 18)
    today = date.today()
    under_18_date = f"{today.year - 17}-{today.month:02d}-{today.day:02d}"
    payload = {"birthdate": under_18_date}

    response = await client.patch(
        "/api/profiles/me", json=payload, headers=auth_headers
    )
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_profile_privacy_masking(
    client: AsyncClient, auth_headers: dict, test_user: "User"
):
    # 1. Set pronouns and set privacy to PRIVATE
    payload = {"pronouns": "They/Them"}
    await client.patch("/api/profiles/me", json=payload, headers=auth_headers)

    privacy_payload = {"pronouns": "PRIVATE"}
    await client.put(
        "/api/profiles/me/privacy", json=privacy_payload, headers=auth_headers
    )

    # 2. Get profile as self (should see it)
    response = await client.get("/api/profiles/me", headers=auth_headers)
    assert response.json()["pronouns"] == "They/Them"

    # 3. Get profile as anonymous (should NOT see it)
    response = await client.get(f"/api/profiles/{test_user.id}")
    assert response.status_code == 200
    assert response.json()["pronouns"] is None


# ============ Phase 4: Lifestyle & Social Intent Tests ============


@pytest.mark.asyncio
async def test_patch_profile_lifestyle(client: AsyncClient, auth_headers: dict):
    """Test updating lifestyle fields (relationship_status, looking_for)"""
    payload = {
        "relationship_status": "Single",
        "looking_for": ["Friendship", "Networking", "Dating"],
    }

    response = await client.patch(
        "/api/profiles/me", json=payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["relationship_status"] == "Single"
    assert data["looking_for"] == ["Friendship", "Networking", "Dating"]


@pytest.mark.asyncio
async def test_patch_profile_looking_for_update(
    client: AsyncClient, auth_headers: dict
):
    """Test updating looking_for array replaces previous values"""
    # First set
    payload1 = {"looking_for": ["Friendship"]}
    response = await client.patch(
        "/api/profiles/me", json=payload1, headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["looking_for"] == ["Friendship"]

    # Second set should replace
    payload2 = {"looking_for": ["Dating", "Long-term Relationship"]}
    response = await client.patch(
        "/api/profiles/me", json=payload2, headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["looking_for"] == ["Dating", "Long-term Relationship"]


@pytest.mark.asyncio
async def test_search_filter_by_relationship_status(
    client: AsyncClient, auth_headers: dict
):
    """Test search API filters by relationship_status"""
    # Set up profile with relationship status
    payload = {"relationship_status": "Single"}
    await client.patch("/api/profiles/me", json=payload, headers=auth_headers)

    # Search with filter
    response = await client.get("/api/search/?relationship_status=Single")
    assert response.status_code == 200, f"search got {response.status_code}: {response.text}"
    data = response.json()
    assert "items" in data
    # All returned profiles should have the matching relationship status
    for profile in data["items"]:
        assert profile["relationship_status"] == "Single"


@pytest.mark.asyncio
async def test_search_filter_by_looking_for(client: AsyncClient, auth_headers: dict):
    """Test search API filters by looking_for array overlap"""
    # Set up profile with looking_for
    payload = {"looking_for": ["Friendship", "Dating"]}
    await client.patch("/api/profiles/me", json=payload, headers=auth_headers)

    # Search with filter (should match if any value overlaps)
    response = await client.get("/api/search/?looking_for=Friendship")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data


@pytest.mark.asyncio
async def test_search_filter_by_gender_identity(
    client: AsyncClient, auth_headers: dict
):
    """Test search API filters by gender_identity"""
    # Set up profile
    payload = {"gender_identity": "Non-binary"}
    await client.patch("/api/profiles/me", json=payload, headers=auth_headers)

    # Search with filter
    response = await client.get("/api/search/?gender_identity=Non-binary")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data


@pytest.mark.asyncio
async def test_search_filter_by_industry(client: AsyncClient, auth_headers: dict):
    """Test search API filters by industry"""
    # Set up profile
    payload = {"industry": "Technology"}
    await client.patch("/api/profiles/me", json=payload, headers=auth_headers)

    # Search with filter
    response = await client.get("/api/search/?industry=Technology")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data


@pytest.mark.asyncio
async def test_search_combined_filters(client: AsyncClient, auth_headers: dict):
    """Test search API with multiple filters combined"""
    # Set up profile
    payload = {
        "relationship_status": "Single",
        "looking_for": ["Dating"],
        "gender_identity": "Cis-male",
        "industry": "Technology",
    }
    await client.patch("/api/profiles/me", json=payload, headers=auth_headers)

    # Search with combined filters
    response = await client.get(
        "/api/search/?relationship_status=Single&gender_identity=Cis-male&industry=Technology"
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data


# ============ Phase 5: Professional & Social Graph / Privacy Tests ============


@pytest.mark.asyncio
async def test_patch_profile_professional(client: AsyncClient, auth_headers: dict):
    """Test updating professional fields"""
    payload = {
        "occupation": "Software Engineer",
        "industry": "Technology",
        "education_level": "Masters Degree",
        "university": "MIT",
    }

    response = await client.patch(
        "/api/profiles/me", json=payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["occupation"] == "Software Engineer"
    assert data["industry"] == "Technology"
    assert data["education_level"] == "Masters Degree"
    assert data["university"] == "MIT"


@pytest.mark.asyncio
async def test_patch_profile_social_links(client: AsyncClient, auth_headers: dict):
    """Test updating social links with HTTPS validation"""
    payload = {
        "social_links": {
            "instagram_url": "https://instagram.com/testuser",
            "x_url": "https://x.com/testuser",
            "tiktok_url": "https://tiktok.com/@testuser",
            "website_url": "https://example.com",
        }
    }

    response = await client.patch(
        "/api/profiles/me", json=payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["social_links"]["instagram_url"] == "https://instagram.com/testuser"
    assert data["social_links"]["x_url"] == "https://x.com/testuser"


@pytest.mark.asyncio
async def test_social_links_http_rejected(client: AsyncClient, auth_headers: dict):
    """Test that HTTP (non-HTTPS) URLs are rejected"""
    payload = {
        "social_links": {
            "instagram_url": "http://instagram.com/testuser"  # HTTP not HTTPS
        }
    }

    response = await client.patch(
        "/api/profiles/me", json=payload, headers=auth_headers
    )
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_social_links_invalid_domain_rejected(
    client: AsyncClient, auth_headers: dict
):
    """Test that invalid Instagram URLs are rejected"""
    payload = {"social_links": {"instagram_url": "https://notinstagram.com/testuser"}}

    response = await client.patch(
        "/api/profiles/me", json=payload, headers=auth_headers
    )
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_bulk_privacy_update(client: AsyncClient, auth_headers: dict):
    """Test bulk privacy settings update"""
    privacy_payload = {
        "occupation": "PRIVATE",
        "industry": "FRIENDS_ONLY",
        "pronouns": "PUBLIC",
        "relationship_status": "PRIVATE",
    }

    response = await client.put(
        "/api/profiles/me/privacy", json=privacy_payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["privacy_settings"]["occupation"] == "PRIVATE"
    assert data["privacy_settings"]["industry"] == "FRIENDS_ONLY"
    assert data["privacy_settings"]["pronouns"] == "PUBLIC"
    assert data["privacy_settings"]["relationship_status"] == "PRIVATE"


@pytest.mark.asyncio
async def test_privacy_masking_friends_only(
    client: AsyncClient, auth_headers: dict, test_user: "User"
):
    """Test that FRIENDS_ONLY fields are hidden from non-friends"""
    # 1. Set occupation and set privacy to FRIENDS_ONLY
    payload = {"occupation": "Secret Agent"}
    await client.patch("/api/profiles/me", json=payload, headers=auth_headers)

    privacy_payload = {"occupation": "FRIENDS_ONLY"}
    await client.put(
        "/api/profiles/me/privacy", json=privacy_payload, headers=auth_headers
    )

    # 2. Get profile as owner (should see it)
    response = await client.get("/api/profiles/me", headers=auth_headers)
    assert response.json()["occupation"] == "Secret Agent"

    # 3. Get profile as anonymous/non-friend (should NOT see it)
    response = await client.get(f"/api/profiles/{test_user.id}")
    assert response.status_code == 200
    assert response.json()["occupation"] is None


@pytest.mark.asyncio
async def test_privacy_settings_merge(client: AsyncClient, auth_headers: dict):
    """Test that privacy settings are merged, not replaced"""
    # Set first setting
    privacy1 = {"occupation": "PRIVATE"}
    await client.put("/api/profiles/me/privacy", json=privacy1, headers=auth_headers)

    # Set second setting (should merge with first)
    privacy2 = {"industry": "FRIENDS_ONLY"}
    response = await client.put(
        "/api/profiles/me/privacy", json=privacy2, headers=auth_headers
    )

    data = response.json()
    assert data["privacy_settings"]["occupation"] == "PRIVATE"
    assert data["privacy_settings"]["industry"] == "FRIENDS_ONLY"


@pytest.mark.asyncio
async def test_social_links_merge_on_patch(client: AsyncClient, auth_headers: dict):
    """Test that social links are merged on PATCH, not replaced"""
    # Set first link
    payload1 = {"social_links": {"instagram_url": "https://instagram.com/user1"}}
    await client.patch("/api/profiles/me", json=payload1, headers=auth_headers)

    # Set second link (should merge)
    payload2 = {"social_links": {"x_url": "https://x.com/user1"}}
    response = await client.patch(
        "/api/profiles/me", json=payload2, headers=auth_headers
    )

    data = response.json()
    assert data["social_links"]["instagram_url"] == "https://instagram.com/user1"
    assert data["social_links"]["x_url"] == "https://x.com/user1"
