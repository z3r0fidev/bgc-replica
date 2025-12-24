# Feature Specification: Community Forums Re-Design (High-Density Modern)

**Feature Branch**: `011-community-forum-redesign`  
**Created**: 2025-12-23
**Status**: Draft  
**Input**: User description: "Overhaul the Community Forums section to implement a high-density, categorical directory layout inspired by industry-standard community boards (XenForo/ListCrawler) while integrating modern PWA features and 'Liquid Glass' aesthetics."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Categorical Tree Navigation (Priority: P1)

As a community member interested in specific topics, I want a hierarchical tree-view of all forum categories and sub-forums in a persistent sidebar so that I can quickly jump between different discussion areas without returning to the home page.

**Why this priority**: Fundamental navigation mechanism for a complex directory-style forum.

**Independent Test**: Can be tested by expanding/collapsing the sidebar tree and clicking on sub-forum nodes to verify correct content loading.

**Acceptance Scenarios**:

1. **Given** the Community Forums page, **When** I use the left-hand navigation tree, **Then** I can expand parent categories to see sub-forums.
2. **Given** a sub-forum selection, **When** I click a node in the tree, **Then** the main content area refreshes with that sub-forum's thread list in under 150ms.

---

### User Story 2 - High-Density Thread Browsing (Priority: P2)

As an active forum user, I want to see a condensed list of threads with key information (replies, views, last post author) at a glance so that I can efficiently scan for new activity and relevant discussions.

**Why this priority**: Essential for high-volume community interaction and "information-first" UX.

**Independent Test**: Can be tested by viewing a thread list on a mobile device and verifying at least 12 threads are visible in the viewport.

**Acceptance Scenarios**:

1. **Given** a sub-forum thread list, **When** viewed on mobile, **Then** each row displays the title, reply count, and a small avatar of the last poster.
2. **Given** a thread list, **When** scrolling, **Then** the interface remains performant (60 FPS) and displays "Hot" or "Sticky" icons where applicable.

---

### User Story 3 - Themed Branding & Aesthetics (Priority: P3)

As a user browsing the site, I want the forum UI to match the "Liquid Glass" aesthetic and include topical banners so that the experience feels premium, modern, and integrated with the rest of the platform.

**Why this priority**: Ensures visual consistency and professional branding.

**Independent Test**: Can be tested by navigating to different sub-forums (e.g. "Health" vs "Events") and verifying the header banner and background effects match the category theme.

**Acceptance Scenarios**:

1. **Given** a "Health & Wellness" sub-forum, **When** I visit the page, **Then** a relevant wellness-themed banner is displayed in the header.
2. **Given** the forum layout, **When** I view thread rows, **Then** they exhibit glassmorphism (backdrop-blur) effects consistent with Phase 4 design.

### Edge Cases

- **Deep Nesting**: How does the navigation tree handle more than 3 levels of nesting? (Tree should support infinite nesting with indentations, though UI should recommend limiting to 3-4).
- **Zero Content**: What does a sub-forum look like with no threads? (Display a "No discussions here yet. Start one!" message with a prominent "Create Thread" button).
- **Long Titles**: How are very long thread titles handled in high-density rows? (Truncate with ellipsis while ensuring stats remain visible).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support nested forum categories (Parent -> Child) in the database and API.
- **FR-002**: UI MUST provide a persistent left-hand tree navigation sidebar for quick forum jumping.
- **FR-003**: Thread listing view MUST use a high-density row format displaying: Status (Icon), Title, Author, Stats (Replies/Views), and Last Post (User/Time).
  - **Sticky**: Manually pinned by admin.
  - **Hot**: Automatically flagged if thread has > 50 replies or > 500 views.
  - **Unread**: Visual indicator if new posts exist since user's last view.
- **FR-004**: System MUST provide a dynamic breadcrumb trail (e.g., Home > Local > Philadelphia) for all forum depths.
- **FR-005**: UI MUST implement a Floating Action Button (FAB) for "Create Thread" accessible from all forum views.
- **FR-006**: Visual design MUST utilize "Liquid Glass" aesthetics (glassmorphism, translucent overlays) for containers and rows.

### Key Entities *(include if feature involves data)*

- **ForumCategory**: Represents a discussion area; supports self-referential `parent_id` for hierarchy.
- **ForumThread**: Represents a discussion topic; includes `view_count` and foreign key to `ForumCategory`.
- **ThreadStats**: Derived or cached values for total replies and latest activity metadata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sub-forum navigation latency (click to content render) MUST be under 150ms.
- **SC-002**: A minimum of 12 thread rows MUST be visible simultaneously on a standard mobile viewport (e.g., iPhone 13/14).
- **SC-003**: 100% adherence to "Liquid Glass" design tokens (blur radius, border opacity, accent colors).
- **SC-004**: 90%+ user task completion rate for finding a specific sub-forum via the tree navigation.