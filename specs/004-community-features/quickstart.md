# Quickstart: Community Features

## 1. Database Initialization

### Forum Categories
Seed the initial categories using the provided script:
```bash
cd backend
$env:PYTHONPATH="."
.\venv\Scripts\python app/core/seed_forums.py
```
*Categories seeded: General, Health & Wellness, Local Events, Hot Topics, Support.*

### Admin Role
Ensure your user has the `is_superuser` flag set to `True` in the `users` table to access the moderation dashboard.

## 2. Redis Setup for Feeds

Ensure Redis is running (used for fan-out-on-write):
```bash
docker run -d -p 6379:6379 redis:latest
```

## 3. Storage Setup
Post and Forum attachments use the `user-media` bucket established in Phase 2. Ensure RLS policies allow authenticated users to upload to the `posts/` folder.

## 4. Run Migrations
Generate and apply migrations for the new community models:
```bash
cd backend
.\venv\Scripts\alembic revision --autogenerate -m "Add community models"
.\venv\Scripts\alembic upgrade head
```
