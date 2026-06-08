# Feature Specification: Personals Section Expansion (Post, Follow, Comment)

**Feature Branch**: `012-personals-expansion`  
**Created**: 2025-12-24
**Status**: Draft  
**Input**: User description: "Expand Personals section with Post, Follow, and Comment features" based on @frontend/frontend-enhancements/personals/PERSONALS_EXPANSION_SPEC_DESC.md

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Personal Post (Priority: P1)

As a member looking to find a connection, I want to create a new personal post with rich text, emojis, and media attachments so that I can express myself effectively and attract interest.

**Why this priority**: Core functionality for content generation in the personals section.

**Independent Test**: Can be tested by opening the "Post Now" interface, adding text/emojis, uploading an image, and verifying the post appears in the list.

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** I click "Post Now", **Then** I see a rich-text editor and a media upload area.
2. **Given** a post draft, **When** I add emojis and attach a photo, **Then** I can preview and publish the post successfully.

---

### User Story 2 - Follow Personal Posts (Priority: P2)

As a user browsing personals, I want to follow specific posts that interest me so that I can easily find them later and receive updates on new activity.

**Why this priority**: Essential for user engagement and return visits.

**Independent Test**: Can be tested by clicking the "Follow" button on a post and verifying the state persists after a page reload.

**Acceptance Scenarios**:

1. **Given** a personal post, **When** I click the "Follow" button (postFollowBtn.png), **Then** the button state updates visually and the post is added to my "Following" list.

---

### User Story 3 - Comment on Posts (Priority: P3)

As a community member, I want to leave comments on personal posts so that I can engage in discussion and provide feedback or ask questions.

**Why this priority**: Fundamental social interaction for the personals directory.

**Independent Test**: Can be tested by clicking the "Comments" button, typing a message, and verifying it appears in the threaded list.

**Acceptance Scenarios**:

1. **Given** a personal post, **When** I click the "Comments" button (commentsBtn.png), **Then** a threaded discussion section opens below the post.

### Edge Cases

- What happens if a user tries to upload a massive video file? (System should enforce size limits and show a clear error message).
- How does the system handle "Follow" toggling if the backend is slow? (Implement optimistic UI updates to ensure responsiveness).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001: Post Now Interface**: System MUST provide a modal or dedicated page featuring a rich-text editor with emoji support and a multi-media upload zone for pictures and videos.
- **FR-002: Follow Functionality**: System MUST implement a "Follow" action on every personal post using the `postFollowBtn.png` asset. State MUST be persisted in a dedicated relational table for high-performance querying.
- **FR-003: Commenting System**: System MUST provide a "Comments" action using the `commentsBtn.png` asset that opens a threaded discussion section. Threading MUST be limited to 2 levels of nesting.
- **FR-004: Interactive Assets**: The UI MUST utilize the high-fidelity button assets extracted from the reference site for "Follow" and "Comments".
- **FR-005: Media Persistence**: All uploaded post media MUST be stored in Supabase and associated with the post via the existing `Media` relationship model.

### Key Entities *(include if feature involves data)*

- **Personal Post**: An extension or specialization of `ForumThread` or a new entity that tracks `is_personal`, `follow_count`, and `comment_count`.
- **Comment**: A threaded discussion entry associated with a `Personal Post`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the post creation flow (text + 1 image) in under 30 seconds.
- **SC-002**: "Follow" and "Unfollow" state transitions are reflected in the UI in under 100ms (Optimistic UI).
- **SC-003**: The comment section supports at least 50 concurrent entries without layout shifting or visible lag during scrolling.
- **SC-004**: 100% of uploaded media is successfully persisted and served with sub-200ms latency.