# Implementation Plan: Media Gallery & Albums

## Constitution Checklist

- [x] **Tests First**: Unit tests for upload service, E2E tests for gallery interactions
- [x] **Manual Verification**: Upload flow, lightbox navigation, album organization
- [x] **Existing Patterns**: Follows existing media upload in profiles.py, uses Supabase Storage
- [x] **Minimal Changes**: New routes added, existing Profile model extended with gallery relation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  /gallery              → Personal gallery grid                   │
│  /gallery/albums       → Album list view                         │
│  /gallery/albums/[id]  → Single album view                       │
│  /profile/[id]/gallery → Public gallery view                     │
├─────────────────────────────────────────────────────────────────┤
│  Components:                                                     │
│  - MediaUploader (drag-drop, progress, multi-file)              │
│  - GalleryGrid (virtualized, lazy-load)                         │
│  - MediaLightbox (swipe, keyboard, zoom)                        │
│  - AlbumCard, AlbumEditor                                       │
│  - PrivacySelector (reuse from profile expansion)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (FastAPI)                         │
├─────────────────────────────────────────────────────────────────┤
│  POST   /api/media/upload      → Upload with processing         │
│  GET    /api/media/            → List user's media (paginated)  │
│  GET    /api/media/{id}        → Get single media item          │
│  DELETE /api/media/{id}        → Delete media item              │
│  PATCH  /api/media/{id}        → Update privacy/metadata        │
├─────────────────────────────────────────────────────────────────┤
│  POST   /api/albums/           → Create album                   │
│  GET    /api/albums/           → List user's albums             │
│  GET    /api/albums/{id}       → Get album with media           │
│  PATCH  /api/albums/{id}       → Update album                   │
│  DELETE /api/albums/{id}       → Delete album                   │
│  POST   /api/albums/{id}/media → Add media to album             │
│  DELETE /api/albums/{id}/media/{media_id} → Remove from album   │
│  POST   /api/albums/{id}/share → Generate share link            │
│  GET    /api/albums/shared/{token} → Access shared album        │
├─────────────────────────────────────────────────────────────────┤
│  GET    /api/users/{id}/gallery → Public gallery (privacy-aware)│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Storage (Supabase)                           │
├─────────────────────────────────────────────────────────────────┤
│  Bucket: bgclive-media                                          │
│  Path: /{user_id}/gallery/{media_id}.{ext}                      │
│  Thumbnails: /{user_id}/gallery/thumbs/{media_id}.webp          │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

```sql
-- Extend existing Media table or create new
CREATE TABLE gallery_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('IMAGE', 'VIDEO')),
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    storage_path TEXT NOT NULL,
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    size_bytes BIGINT,
    duration_seconds INTEGER, -- for videos
    privacy VARCHAR(20) DEFAULT 'PUBLIC' CHECK (privacy IN ('PUBLIC', 'FRIENDS_ONLY', 'PRIVATE')),
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gallery_media_user ON gallery_media(user_id);
CREATE INDEX idx_gallery_media_privacy ON gallery_media(privacy);
CREATE INDEX idx_gallery_media_created ON gallery_media(created_at DESC);

CREATE TABLE albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    cover_media_id UUID REFERENCES gallery_media(id) ON DELETE SET NULL,
    privacy VARCHAR(20) DEFAULT 'PUBLIC' CHECK (privacy IN ('PUBLIC', 'FRIENDS_ONLY', 'PRIVATE')),
    share_token VARCHAR(64) UNIQUE,
    share_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_albums_user ON albums(user_id);
CREATE INDEX idx_albums_share_token ON albums(share_token) WHERE share_token IS NOT NULL;

CREATE TABLE album_media (
    album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES gallery_media(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (album_id, media_id)
);

CREATE INDEX idx_album_media_position ON album_media(album_id, position);
```

## Implementation Phases

### Phase 1: Setup (Foundation)
- Create database models and migration
- Set up Supabase Storage bucket policies
- Create base Pydantic schemas

### Phase 2: Core Upload (US1 Foundation)
- Implement upload endpoint with validation
- Add thumbnail generation service (Pillow for images)
- Create storage service wrapper

### Phase 3: Gallery UI (US1 Complete)
- Build MediaUploader component with drag-drop
- Create GalleryGrid with virtualization
- Implement MediaLightbox with navigation

### Phase 4: Albums (US2)
- Add album CRUD endpoints
- Build AlbumCard and AlbumEditor components
- Implement album media management

### Phase 5: Privacy & Sharing (US3)
- Add privacy enforcement to all endpoints
- Implement share link generation
- Build public gallery view with privacy filtering

### Phase 6: Video Support (US4)
- Add video upload handling
- Implement thumbnail extraction (ffmpeg or external service)
- Add video player in lightbox

### Phase 7: Polish
- Performance optimization (lazy loading, CDN hints)
- E2E tests for all user stories
- Accessibility review

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Image Processing | Pillow (Python) | Already available, no new dependencies |
| Thumbnail Format | WebP | Smaller files, wide browser support |
| Video Thumbnails | FFmpeg or Supabase Edge Functions | FFmpeg for local, Edge Functions for serverless |
| Gallery Virtualization | @tanstack/react-virtual | Already used in feed, consistent performance |
| Lightbox | Custom with Framer Motion | Matches existing animation patterns |
| Storage | Supabase Storage | Already integrated, CDN included |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Large file uploads timeout | Chunked uploads, progress tracking |
| Video processing slow | Background job queue, status polling |
| Storage costs | Compression, size limits, cleanup policies |
| Privacy leaks | Server-side enforcement, signed URLs |

## Dependencies

- Existing: Supabase Storage, User/Profile models, PrivacyToggle component
- New: Pillow (image processing), possibly ffmpeg-python (video)
