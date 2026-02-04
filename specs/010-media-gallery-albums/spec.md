# Feature Specification: Media Gallery & Albums

**Feature Branch**: `010-media-gallery-albums`
**Created**: 2026-01-31
**Status**: Draft
**Priority**: P1

## Overview

Implement a comprehensive media management system allowing users to upload, organize, and share photos and videos. The system includes personal galleries, shareable albums, privacy controls, and optimized media delivery.

## User Scenarios & Testing

### User Story 1 - Personal Gallery (Priority: P1) MVP

As a user, I want to upload and view my photos and videos in a personal gallery so that I can showcase my media content on my profile.

**Why this priority**: Core functionality for media management.

**Independent Test**: Upload an image, verify it appears in the gallery grid, click to view full-size.

**Acceptance Scenarios**:
1. **Given** an authenticated user, **When** they upload a valid image (JPEG, PNG, WebP), **Then** the image is stored and appears in their gallery within 5 seconds.
2. **Given** a user with media, **When** they view their gallery, **Then** images are displayed in a responsive grid sorted by upload date (newest first).
3. **Given** a user viewing their gallery, **When** they click an image, **Then** a lightbox opens showing the full-size image with navigation controls.

### User Story 2 - Albums & Organization (Priority: P2)

As a user, I want to create albums and organize my media into collections so that I can group related photos together.

**Why this priority**: Enhances organization after basic gallery is functional.

**Independent Test**: Create an album, add 3 photos, verify album displays correctly with cover image.

**Acceptance Scenarios**:
1. **Given** a user, **When** they create an album with a title and optional description, **Then** the album is created and visible in their albums list.
2. **Given** a user with media, **When** they select multiple items and add to an album, **Then** items appear in the album and remain in the main gallery.
3. **Given** an album with media, **When** viewing the album, **Then** the first image is used as cover (or user-selected cover).

### User Story 3 - Media Privacy & Sharing (Priority: P3)

As a user, I want to control who can see my photos and share specific albums so that I can manage my privacy.

**Why this priority**: Privacy controls are essential before public release.

**Independent Test**: Set an album to "Friends Only", verify non-friends cannot access it.

**Acceptance Scenarios**:
1. **Given** a media item or album, **When** the owner sets privacy to PUBLIC/FRIENDS_ONLY/PRIVATE, **Then** visibility is enforced for all viewers.
2. **Given** a private album, **When** the owner generates a share link, **Then** the link allows temporary access to the album.
3. **Given** a user viewing another's profile, **When** they access the gallery, **Then** only permitted media based on privacy settings is shown.

### User Story 4 - Video Support (Priority: P4)

As a user, I want to upload and view videos so that I can share video content in my gallery.

**Why this priority**: Extends functionality after image support is stable.

**Independent Test**: Upload a video (MP4), verify thumbnail is generated, play video in lightbox.

**Acceptance Scenarios**:
1. **Given** a video upload (MP4, WebM, max 100MB), **When** processing completes, **Then** a thumbnail is generated and video is playable.
2. **Given** a video in gallery, **When** clicked, **Then** video plays in lightbox with standard controls (play, pause, seek, volume).

### Edge Cases

- Maximum file size exceeded (show clear error with limit)
- Unsupported file format (show supported formats)
- Upload interrupted (resume capability or clear failure message)
- Corrupt file uploaded (validate and reject with message)
- Gallery with 1000+ items (virtualized scrolling)
- Album with no items (show empty state with add prompt)

## Requirements

### Functional Requirements

- **FR-001**: Support image uploads (JPEG, PNG, WebP, GIF) up to 10MB each.
- **FR-002**: Support video uploads (MP4, WebM) up to 100MB each.
- **FR-003**: Generate thumbnails for all media (images: 300x300, videos: first frame).
- **FR-004**: Display gallery in responsive grid (3 cols mobile, 4 cols tablet, 6 cols desktop).
- **FR-005**: Implement lightbox with swipe navigation and keyboard controls.
- **FR-006**: Allow creation of unlimited albums per user.
- **FR-007**: Support drag-and-drop reordering within albums.
- **FR-008**: Enforce privacy settings (PUBLIC, FRIENDS_ONLY, PRIVATE) per item and album.
- **FR-009**: Generate shareable links for albums with optional expiration.
- **FR-010**: Track view counts on public media.

### Non-Functional Requirements

- **NFR-001**: Upload processing < 10 seconds for images, < 60 seconds for videos.
- **NFR-002**: Gallery page load < 500ms with lazy loading for images.
- **NFR-003**: Support concurrent uploads (up to 5 files at once).
- **NFR-004**: Store media on Supabase Storage with CDN delivery.
- **NFR-005**: EXIF data stripped from uploads for privacy.

### Key Entities

- **Media**: id, user_id, type (IMAGE/VIDEO), url, thumbnail_url, storage_path, width, height, size_bytes, duration_seconds (video), privacy, view_count, created_at
- **Album**: id, user_id, title, description, cover_media_id, privacy, share_token, share_expires_at, created_at
- **AlbumMedia**: album_id, media_id, position (for ordering)

## Success Criteria

- **SC-001**: Users can upload images and see them in gallery within 5 seconds.
- **SC-002**: Gallery loads in < 500ms for up to 100 items.
- **SC-003**: Albums display with proper cover images and item counts.
- **SC-004**: Privacy settings correctly restrict access (verified by E2E test).
- **SC-005**: Video playback works on all modern browsers (Chrome, Firefox, Safari, Edge).
