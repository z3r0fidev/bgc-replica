# Database Seeding Task List

This task list outlines the order and requirements for seeding the initial data into the `bgc_test_db`. Dependencies must be respected to maintain referential integrity.

## Prerequisites
- [x] **Database Created**: `bgc_test_db` exists and is accessible.
- [x] **Migrations Applied**: `alembic upgrade head` has been run successfully.
- [x] **Virtual Environment Active**: `backend\venv` is active.

## Seeding Order

### 1. Core Users (Level 0 Dependencies)
- [x] **Create Admin User**: A superuser for administrative tasks.
- [x] **Create Standard Users**: A set of regular users to simulate community interaction.
    - *Script*: `backend/app/core/seed_users.py` (Handled via initial_schema/logic)
    - *Models*: `User`, `Account` (optional placeholders)

### 2. User Profiles (Depends on Users)
- [x] **Create Profiles**: Basic profile information for the seeded users.
    - *Attributes*: Bio, Location, Stats (Height, Weight, etc.)
    - *Script*: Extend `seed_users.py` or create `seed_profiles.py`
    - *Models*: `Profile`

### 3. Community Structure (Level 0 Dependencies)
- [x] **Seed Forum Categories**: The foundational categories for the forum.
    - *Existing Script*: `backend/app/core/seed_forums.py`
    - *Models*: `ForumCategory`

### 4. Social Graph (Depends on Users)
- [x] **Create Friendships**: Establish `FRIEND` relationships between seeded users.
- [x] **Create Favorites**: Add `FAVORITE` relationships.
- [x] **Create Blocks**: (Optional) Add `BLOCKED` relationships for testing constraints.
    - *Models*: `Relationship`

### 5. Content (Depends on Users & Categories)
- [x] **Seed Forum Threads**: Create threads within the seeded categories authored by seeded users.
    - *Models*: `ForumThread`
- [x] **Seed Forum Posts**: Add replies to the seeded threads.
    - *Models*: `ForumPost`
- [x] **Seed Status Updates**: Create feed activity for users.
    - *Models*: `StatusUpdate`

### 6. Groups (Depends on Users)
- [x] **Create Community Groups**: Public and private groups owned by seeded users.
    - *Models*: `CommunityGroup`
- [x] **Add Memberships**: Add other users to these groups.
    - *Models*: `GroupMembership`

## Execution Guide

To run the seeding process, you can execute the scripts individually or create a master seed script.

**Example execution:**
```bash
# Set PYTHONPATH to include the backend root
$env:PYTHONPATH="."

# Run existing forum seed
python app/core/seed_forums.py

# Run custom user seed (once created)
python app/core/seed_users.py
```
