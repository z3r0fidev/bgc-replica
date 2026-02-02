-- ============================================================
-- Supabase Storage Setup Script for Media Gallery
-- Spec 010 - Media Gallery & Albums (Task T004)
-- ============================================================
--
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Paste this entire script
-- 3. Click "Run" to execute
-- 4. Verify policies in Storage → Policies
--
-- Prerequisites:
-- - The 'gallery_media' table must exist (run Alembic migrations first)
-- - Bucket 'bgclive-media' should be created via Dashboard or CLI
--
-- ============================================================

-- ============================================================
-- STEP 1: Create the storage bucket (if not exists)
-- ============================================================
-- Note: Bucket creation via SQL is limited.
-- Create the bucket manually in Dashboard → Storage → New Bucket:
--   Name: bgclive-media
--   Public: false
--   File size limit: 100MB (for videos)
--   Allowed MIME types: image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm

-- Alternatively, use Supabase CLI:
-- supabase storage create bgclive-media --public=false

-- ============================================================
-- STEP 2: Drop existing policies (clean slate)
-- ============================================================

DROP POLICY IF EXISTS "Users can upload to own gallery" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view public media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view accessible media" ON storage.objects;
DROP POLICY IF EXISTS "Service role has full access" ON storage.objects;

-- ============================================================
-- STEP 3: Create INSERT policy (upload)
-- ============================================================
-- Allows authenticated users to upload files to their own folder

CREATE POLICY "Users can upload to own gallery"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bgclive-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- STEP 4: Create UPDATE policy (modify)
-- ============================================================
-- Allows users to update/replace their own files

CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bgclive-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'bgclive-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- STEP 5: Create DELETE policy (remove)
-- ============================================================
-- Allows users to delete their own files

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'bgclive-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- STEP 6: Create SELECT policy (view/download)
-- ============================================================
-- Controls who can view files based on privacy settings

CREATE POLICY "Authenticated users can view accessible media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bgclive-media'
  AND (
    -- Owner can always view their own files
    (storage.foldername(name))[1] = auth.uid()::text

    -- Public media is viewable by anyone authenticated
    OR EXISTS (
      SELECT 1 FROM public.gallery_media gm
      WHERE gm.storage_path = storage.objects.name
      AND gm.privacy = 'PUBLIC'
    )

    -- FRIENDS_ONLY media (add friendship check when implemented)
    OR EXISTS (
      SELECT 1 FROM public.gallery_media gm
      WHERE gm.storage_path = storage.objects.name
      AND gm.privacy = 'FRIENDS_ONLY'
      AND gm.user_id = auth.uid()
      -- TODO: Add friendship table check here
      -- AND EXISTS (
      --   SELECT 1 FROM friendships f
      --   WHERE (f.user_id = auth.uid() AND f.friend_id = gm.user_id)
      --      OR (f.friend_id = auth.uid() AND f.user_id = gm.user_id)
      --   AND f.status = 'ACCEPTED'
      -- )
    )
  )
);

-- Public (anonymous) access for public media only
CREATE POLICY "Public can view public media"
ON storage.objects FOR SELECT
TO anon
USING (
  bucket_id = 'bgclive-media'
  AND EXISTS (
    SELECT 1 FROM public.gallery_media gm
    WHERE gm.storage_path = storage.objects.name
    AND gm.privacy = 'PUBLIC'
  )
);

-- ============================================================
-- STEP 7: Service role policy (for backend operations)
-- ============================================================
-- Allows the backend service role full access

CREATE POLICY "Service role has full access"
ON storage.objects
TO service_role
USING (bucket_id = 'bgclive-media')
WITH CHECK (bucket_id = 'bgclive-media');

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to verify policies were created correctly:

-- List all policies on storage.objects
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;

-- ============================================================
-- ROLLBACK (if needed)
-- ============================================================
-- Uncomment and run to remove all policies:
--
-- DROP POLICY IF EXISTS "Users can upload to own gallery" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
-- DROP POLICY IF EXISTS "Public can view public media" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can view accessible media" ON storage.objects;
-- DROP POLICY IF EXISTS "Service role has full access" ON storage.objects;
