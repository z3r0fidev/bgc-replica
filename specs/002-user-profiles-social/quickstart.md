# Quickstart: User Profiles & Social Graph

## 1. Storage Setup
You must create a bucket in Supabase Storage for user media.

1. Go to **Supabase Dashboard** -> **Storage**.
2. Create a new bucket named `user-media`.
3. Set the bucket to **Public** (or configure RLS policies if restricted access is desired).
4. Update `.env` with bucket name if different.

## 2. Environment Variables
Add the following to your `backend/.env`:

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-service-role-key"
MEDIA_BUCKET_NAME="user-media"
IPINFO_TOKEN="your-ipinfo-token" # Optional, for geolocation
```

## 3. Local Development
Ensure Redis is running for search indexing and caching.

```bash
docker run -d -p 6379:6379 redis:latest
```

## 4. Run Migrations
Generate and apply migrations for the new profile and social models.

```bash
cd backend
$env:PYTHONPATH="."
.\venv\Scripts\alembic revision --autogenerate -m "Add profiles and social models"
.\venv\Scripts\alembic upgrade head
```
