# Supabase Storage Setup Guide

## Overview

This guide covers the configuration of Supabase Storage for the Media Gallery feature (Spec 010). The gallery uses Supabase Storage to store user-uploaded images and videos with privacy controls.

## Prerequisites

1. Supabase project created and configured
2. Database migrations applied (`alembic upgrade head`)
3. Environment variables set in `backend/.env`:
   ```env
   SUPABASE_URL=https://[project-id].supabase.co
   SUPABASE_KEY=[service-role-key]
   MEDIA_BUCKET_NAME=bgclive-media
   ```

## Storage Architecture

### Folder Structure

```
bgclive-media/                    # Main bucket
├── {user-uuid}/                  # User folder (matches auth.uid())
│   └── gallery/                  # Gallery subfolder
│       ├── {media-id}.jpg        # Original image
│       ├── {media-id}.mp4        # Original video
│       └── thumbs/               # Thumbnails folder
│           └── {media-id}.webp   # WebP thumbnail
```

### Privacy Levels

| Level | Description | Access |
|-------|-------------|--------|
| `PUBLIC` | Visible to everyone | Anyone (including anonymous) |
| `FRIENDS_ONLY` | Visible to friends | Owner + accepted friends |
| `PRIVATE` | Only owner can see | Owner only |

## Setup Instructions

### Method 1: SQL Script (Recommended)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy contents of `scripts/setup-supabase-storage.sql`
3. Paste and click **Run**
4. Verify in **Storage** → **Policies**

### Method 2: Manual Dashboard Configuration

#### Step 1: Create the Bucket

1. Go to **Storage** → **New Bucket**
2. Configure:
   - **Name**: `bgclive-media`
   - **Public bucket**: `No` (unchecked)
   - **File size limit**: `104857600` (100MB)
   - **Allowed MIME types**:
     ```
     image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm, video/quicktime
     ```

#### Step 2: Create Storage Policies

Navigate to **Storage** → **Policies** → Select `bgclive-media` bucket

##### Policy 1: Upload (INSERT)

- **Name**: `Users can upload to own gallery`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
  ```sql
  bucket_id = 'bgclive-media' AND (storage.foldername(name))[1] = auth.uid()::text
  ```

##### Policy 2: Update (UPDATE)

- **Name**: `Users can update own files`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**:
  ```sql
  bucket_id = 'bgclive-media' AND (storage.foldername(name))[1] = auth.uid()::text
  ```
- **WITH CHECK expression**:
  ```sql
  bucket_id = 'bgclive-media' AND (storage.foldername(name))[1] = auth.uid()::text
  ```

##### Policy 3: Delete (DELETE)

- **Name**: `Users can delete own files`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:
  ```sql
  bucket_id = 'bgclive-media' AND (storage.foldername(name))[1] = auth.uid()::text
  ```

##### Policy 4: View for Authenticated Users (SELECT)

- **Name**: `Authenticated users can view accessible media`
- **Allowed operation**: `SELECT`
- **Target roles**: `authenticated`
- **USING expression**:
  ```sql
  bucket_id = 'bgclive-media'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.gallery_media gm
      WHERE gm.storage_path = storage.objects.name
      AND gm.privacy = 'PUBLIC'
    )
  )
  ```

##### Policy 5: Public View (SELECT)

- **Name**: `Public can view public media`
- **Allowed operation**: `SELECT`
- **Target roles**: `anon`
- **USING expression**:
  ```sql
  bucket_id = 'bgclive-media'
  AND EXISTS (
    SELECT 1 FROM public.gallery_media gm
    WHERE gm.storage_path = storage.objects.name
    AND gm.privacy = 'PUBLIC'
  )
  ```

##### Policy 6: Service Role Access

- **Name**: `Service role has full access`
- **Allowed operation**: `ALL`
- **Target roles**: `service_role`
- **USING expression**: `bucket_id = 'bgclive-media'`
- **WITH CHECK expression**: `bucket_id = 'bgclive-media'`

### Step 3: Configure CORS (if needed)

1. Go to **Storage** → **Settings**
2. Add allowed origins:
   ```json
   {
     "allowedOrigins": [
       "http://localhost:3000",
       "https://yourdomain.com"
     ],
     "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
     "allowedHeaders": ["Authorization", "Content-Type", "x-upsert"],
     "maxAge": 3600
   }
   ```

## Verification

### Test Upload

```bash
# Using curl with service role key
curl -X POST \
  'https://[project-id].supabase.co/storage/v1/object/bgclive-media/test/test.txt' \
  -H 'Authorization: Bearer [service-role-key]' \
  -H 'Content-Type: text/plain' \
  -d 'Hello World'
```

### Test via Application

1. Start the application
2. Log in as a user
3. Navigate to `/gallery`
4. Upload an image
5. Verify:
   - Image appears in gallery
   - Thumbnail is generated
   - Image opens in lightbox
   - Privacy setting is respected

### Verify Policies

Run in SQL Editor:
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
```

Expected output:
| policyname | cmd | roles |
|------------|-----|-------|
| Authenticated users can view accessible media | SELECT | {authenticated} |
| Public can view public media | SELECT | {anon} |
| Service role has full access | ALL | {service_role} |
| Users can delete own files | DELETE | {authenticated} |
| Users can update own files | UPDATE | {authenticated} |
| Users can upload to own gallery | INSERT | {authenticated} |

## Troubleshooting

### "new row violates row-level security policy"

**Cause**: User trying to upload to wrong folder path
**Fix**: Ensure upload path starts with `{user_id}/gallery/`

### "Object not found" for public images

**Cause**: Missing SELECT policy for anon role
**Fix**: Create "Public can view public media" policy

### CORS errors in browser

**Cause**: Origin not allowed
**Fix**: Add frontend URL to CORS allowed origins

### "permission denied for table gallery_media"

**Cause**: Storage policies reference gallery_media table but RLS is blocking
**Fix**: Ensure gallery_media table has appropriate RLS policies or use service role

## Security Considerations

1. **Service Role Key**: Never expose in frontend code
2. **File Validation**: Backend validates file types before upload
3. **EXIF Stripping**: Images have EXIF data removed for privacy
4. **Size Limits**: 10MB for images, 100MB for videos
5. **Path Validation**: Users can only write to their own folder

## Related Files

- `backend/app/services/storage.py` - Storage service implementation
- `backend/app/services/media_processor.py` - Thumbnail generation
- `backend/app/api/gallery.py` - Gallery API endpoints
- `scripts/setup-supabase-storage.sql` - SQL setup script
