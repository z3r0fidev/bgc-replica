# Feature Specification: Community Features

**Feature Branch**: `004-community-features`  
**Created**: 2025-12-20  
**Status**: Draft  
**Input**: User description: "Implement community features including threaded forum boards, a social feed for status updates, and user-led groups. Support posting, commenting, and community-driven moderation tools."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Threaded Forum Boards (Priority: P1)

As a community member, I want to participate in organized, threaded discussions so that I can engage in deep conversations about specific topics.

**Why this priority**: Essential for knowledge sharing and historical fidelity to the BGCLive experience.

**Independent Test**: Can be fully tested by creating a new thread in a category and having another user reply to it, ensuring the hierarchy is maintained.

**Acceptance Scenarios**:

1. **Given** a forum category, **When** a user submits a new thread with a title and body, **Then** it appears at the top of the category list.
2. **Given** an existing thread, **When** a user submits a reply, **Then** the reply is appended to the thread and the thread's "last active" timestamp updates.

---

### User Story 2 - Social Feed & Status Updates (Priority: P1)

As a user, I want to share quick status updates and see what others are doing so that I can stay connected with the community's daily life.

**Why this priority**: Provides the "social heartbeat" of the platform and encourages frequent return visits.

**Independent Test**: Can be tested by posting a status update and verifying it appears in the global feed and on the user's profile feed.

**Acceptance Scenarios**:

1. **Given** the social feed page, **When** a user posts a status update, **Then** it appears immediately for all users viewing the feed.
2. **Given** a status update in the feed, **When** a user adds a comment, **Then** the comment is displayed under the post.

---

### User Story 3 - User-Led Groups (Priority: P2)

As a user with a specific interest, I want to create or join a group dedicated to that interest so that I can find like-minded community members.

**Why this priority**: Empowers users to self-organize and build micro-communities.

**Independent Test**: Can be tested by creating a group, inviting a user, and having them join and post within the group's private space.

**Acceptance Scenarios**:

1. **Given** the groups directory, **When** a user clicks "Create Group" and provides details, **Then** they become the group owner.
2. **Given** a group page, **When** a user clicks "Join", **Then** they gain access to the group's internal feed and member list.

---

### User Story 4 - Community-Driven Moderation (Priority: P2)

As a responsible community member, I want to flag inappropriate content so that the platform remains safe and welcoming for everyone.

**Why this priority**: Core mandate for community safety and operational scalability.

**Independent Test**: Can be tested by flagging a post and verifying it appears in the moderator dashboard and is hidden if it exceeds a certain threshold.

**Acceptance Scenarios**:

1. **Given** any post or comment, **When** a user clicks "Report" and selects a reason, **Then** the content is flagged in the system database.
2. **Given** content that has been flagged multiple times, **When** the threshold is met, **Then** the system MUST notify moderators via the dashboard while leaving the content visible for manual review.

---

### Edge Cases

- **Post Deletion**: What happens to replies when a parent forum thread is deleted? (System SHOULD soft-delete or archive the children).
- **Membership Limits**: What happens when a user tries to join more than the allowed number of groups?
- **Nested Comments**: How deep can comments go in the social feed? (System SHOULD limit nesting to 2-3 levels for mobile readability).
- **Spam Control**: How many status updates can a user post in a minute?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support hierarchical forum categories, threads, and replies.
- **FR-002**: System MUST provide a tabbed social feed allowing users to toggle between a "Global" view and a "Following" view.
- **FR-003**: Users MUST be able to create, search, and join groups with their own internal status feeds. System MUST enforce a limit of 50 group memberships per user.
- **FR-004**: System MUST support community flagging for threads, posts, and comments.
- **FR-005**: System MUST allow users to attach images to both status updates and forum posts.
- **FR-006**: System MUST provide a "Moderation Queue" for admins/moderators to review flagged content.

### Key Entities

- **ForumThread**: A topic container within a Category.
- **ForumPost**: An individual message within a thread.
- **StatusUpdate**: A short post in the social feed.
- **Comment**: A response to a StatusUpdate.
- **Group**: A user-managed sub-community.
- **Membership**: Links users to groups with specific roles (Owner, Member).
- **Report**: Records a user complaint against a piece of content.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can post a status update in under 5 seconds from the home screen.
- **SC-002**: Social feed and forum lists MUST load in under 1.5 seconds on a standard 4G connection.
- **SC-003**: 100% of reported content MUST be accessible in the moderation dashboard within 1 minute of flagging.
- **SC-004**: System SHOULD handle 500 concurrent active posters without latency degradation.