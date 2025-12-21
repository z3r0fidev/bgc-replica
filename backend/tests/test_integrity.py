import pytest
import uuid
from sqlalchemy import select
from app.models.user import User, Profile

@pytest.mark.asyncio
async def test_user_profile_cascade_delete(db_session):
    """
    Verify that deleting a User also deletes their Profile.
    """
    # 1. Create a User
    user_id = uuid.uuid4()
    user = User(id=user_id, email=f"test-{user_id}@example.com", name="Test User")
    db_session.add(user)
    
    # 2. Create a Profile for that User
    profile = Profile(id=user_id, bio="Test Bio")
    db_session.add(profile)
    
    await db_session.commit()
    
    # 3. Verify they exist
    result = await db_session.execute(select(User).where(User.id == user_id))
    assert result.scalar_one_or_none() is not None
    
    result = await db_session.execute(select(Profile).where(Profile.id == user_id))
    assert result.scalar_one_or_none() is not None
    
    # 4. Delete the User
    await db_session.delete(user)
    await db_session.commit()
    
    # 5. Verify the Profile is also gone (Cascade Delete)
    result = await db_session.execute(select(Profile).where(Profile.id == user_id))
    assert result.scalar_one_or_none() is None
