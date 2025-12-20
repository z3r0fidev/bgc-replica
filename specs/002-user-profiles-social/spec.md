# Feature Specification: User Profiles & Social Graph

**Feature Branch**: `002-user-profiles-social`  
**Created**: 2025-12-20  
**Status**: Draft  
**Input**: Implement comprehensive user profile management, including stats (height, weight, etc.), bio, and location. Enable multi-photo/video galleries with upload capabilities to Supabase/S3. Implement the social graph features including Favorites, Friends, and the legacy Rating system. Add search and filtering capabilities to find other users by demographics and interests.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Profile Management (Priority: P1)

As a logged-in user, I want to set up and update my profile including my physical stats, bio, and location so that others can learn about me.

**Why this priority**: Core identity feature and prerequisite for social interaction.

**Independent Test**: Can be tested by navigating to the profile edit page, submitting changes, and verifying they are reflected on the public profile view.

**Acceptance Scenarios**:

1. **Given** a user is logged in, **When** they fill out their height, weight, ethnicity, and bio, **Then** these details are saved to their profile.
2. **Given** a user has a profile, **When** they update their location, **Then** the new location is stored and displayed.

---

### User Story 2 - Media Gallery & Uploads (Priority: P1)

As a user, I want to upload and manage multiple photos and videos in my gallery so that I can visually represent myself.

**Why this priority**: High user value and essential for a social networking platform.

**Independent Test**: Can be tested by selecting files from a device, observing the upload progress, and seeing the media appear in the user's gallery.

**Acceptance Scenarios**:

1. **Given** a user on the gallery page, **When** they upload a valid image file, **Then** it is stored in Supabase Storage and displayed in their gallery.
2. **Given** a user has multiple photos, **When** they set one as "Primary", **Then** it is used as their avatar across the site.

---

### User Story 3 - Social Graph (Friends & Favorites) (Priority: P2)

As a user, I want to "Friend" or "Favorite" other users so that I can keep track of connections and build a network.

**Why this priority**: Essential for community building and retention.

**Independent Test**: Can be tested by clicking "Favorite" on another user's profile and verifying they appear in the "My Favorites" list.

**Acceptance Scenarios**:

1. **Given** User A views User B's profile, **When** they click "Add to Favorites", **Then** User B is added to User A's favorite list.
2. **Given** User A sends a "Friend Request" to User B, **When** User B accepts, **Then** both users appear in each other's friends lists.

---

### User Story 4 - Search & Discovery (Priority: P2)

As a user, I want to search for other members by demographics (age, ethnicity, location) so that I can find people who interest me.

**Why this priority**: Core discovery mechanism for the social platform.

**Independent Test**: Can be tested by applying filters on the search page and verifying only matching users are returned.

**Acceptance Scenarios**:

1. **Given** a user on the search page, **When** they filter by "Location: New York", **Then** only users in New York are listed.

---

### User Story 5 - Legacy Rating System (Priority: P3)

As a user, I want to rate other users' profiles (1-10 stars) so that I can provide feedback and engage with the community in a traditional way.

**Why this priority**: Historical fidelity requirement (from original BGCLive).

**Independent Test**: Can be tested by selecting a rating on another user's profile and verifying the average rating updates.

**Acceptance Scenarios**:

1. **Given** User A views User B's profile, **When** they select "8 stars", **Then** the system records the rating and updates User B's overall average.

### Edge Cases

- **Unauthorized Access**: What happens if a user tries to edit another user's profile? (System MUST return 403 Forbidden).
- **Inappropriate Content**: What happens if a user uploads offensive media? (System SHOULD provide a report mechanism and allow admins to flag/delete).
- **Privacy Settings**: What happens if a user sets their profile to "Private"? (System MUST restrict profile visibility to friends only).
- **Large File Handling**: What happens if a user tries to upload a 50MB image? (System MUST enforce file size limits and return an informative error).
- **Rating Spam**: What happens if a user tries to rate the same profile multiple times? (System MUST allow only one rating per user-profile pair, updating the previous one).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support storage and retrieval of extended profile attributes (height, weight, body type, ethnicity, roles, interests).
- **FR-002**: System MUST integrate with Supabase Storage for secure media (image/video) uploads.
- **FR-003**: System MUST implement a "Primary Photo" logic for user avatars.
- **FR-004**: System MUST allow users to manage "Friends" (bilateral) and "Favorites" (unilateral) relationships.
- **FR-005**: System MUST provide a search interface with multi-attribute filtering (Age range, Ethnicity, Location, Online status).
- **FR-006**: System MUST implement a profile/photo rating system (1-10) with average score calculation.
- **FR-007**: System MUST support location-based discovery (Zip code/City based filtering).

### Key Entities

- **Profile**: Extension of User entity. Fields: Bio, Height, Weight, Ethnicity, Location, LastActive.
- **Media**: Represents a gallery item. Fields: URL, Type (Photo/Video), IsPrimary, UserID.
- **Relationship**: Connects two users. Fields: Type (FRIEND, FAVORITE, BLOCKED), Status (PENDING, ACCEPTED).
- **Rating**: Records an interaction. Fields: FromUserID, ToUserID, Score (1-10).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **Upload Latency**: 95% of photo uploads (< 5MB) MUST complete in under 3 seconds on a standard 4G connection.
- **SC-002**: **Search Performance**: Search queries with 3+ filters MUST return results in under 500ms.
- **SC-003**: **UX Fidelity**: 100% of the original legacy profile attributes MUST be available for user input.
- **SC-004**: **Mobile UX**: Media galleries MUST support swipe-to-navigate on mobile touch screens.

## Assumptions

- **Location Data**: We will use a standard geolocation library or service (e.g., ip-api or browser geolocation) to infer location if not manually entered.
- **Media Processing**: We will use Supabase's built-in image transformation or a third-party service (Cloudinary) for generating thumbnails.
- **Social Graph**: We will treat "Friends" as a mutually accepted relationship and "Favorites" as a one-way bookmarking system.