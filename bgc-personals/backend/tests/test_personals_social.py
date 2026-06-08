import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_personal_post(async_client: AsyncClient, auth_headers: dict):
    payload = {
        "category": "transx",
        "content": "<p>Hello world!</p>",
        "media_ids": []
    }
    response = await async_client.post(
        "/api/personals/posts",
        json=payload,
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["content"] == payload["content"]
    assert data["category_slug"] == payload["category"]


@pytest.mark.asyncio
async def test_follow_personal_post(async_client: AsyncClient, auth_headers: dict, db_session):
    from app.models.social import PersonalPost
    from app.models.user import User
    from sqlalchemy import select

    result = await db_session.execute(select(User).limit(1))
    user = result.scalars().first()

    post = PersonalPost(
        author_id=user.id,
        category_slug="transx",
        content="Test post"
    )
    db_session.add(post)
    await db_session.commit()
    await db_session.refresh(post)

    response = await async_client.post(
        f"/api/personals/posts/{post.id}/follow",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["following"] is True
    assert response.json()["count"] == 1

    response = await async_client.post(
        f"/api/personals/posts/{post.id}/follow",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["following"] is False
    assert response.json()["count"] == 0
