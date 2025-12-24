# Feature Specification: Personals Section (TransX Style)

**Feature Branch**: `010-personals-section`  
**Created**: 2025-12-23
**Status**: Draft  
**Input**: User description: "Implement a dedicated 'Personals' section in the BGC Replica platform that replicates the structural and navigational experience of the TransX/ListCrawler directory. This feature focuses on categorical browsing, high-density listing display, and a distinct sidebar-driven navigation system."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Categorical Browsing via Sidebar (Priority: P1)

As a user looking for specific interests, I want to see a sidebar with iconic category links so that I can quickly switch between different niches (e.g., AA OK, MILFY, TransX) and see relevant listings immediately.

**Why this priority**: Core navigation differentiator for the Personals section.

**Independent Test**: Can be tested by clicking different icons in the sidebar and verifying the URL/state changes and the list content updates to match the category.

**Acceptance Scenarios**:

1. **Given** the Personals page is loaded, **When** I click the "MILFY" icon in the right sidebar, **Then** the header banner changes to the MILFY theme and the list updates to show only MILFY-tagged profiles.
2. **Given** a mobile device, **When** I open the Personals section, **Then** the sidebar is collapsed into a navigable menu (drawer or bottom sheet) to preserve screen space.

---

### User Story 2 - High-Density Personal Listings (Priority: P2)

As a user browsing many listings, I want to see a high-density vertical list of personals with thumbnails and quick summaries so that I can scan through many options without excessive scrolling or slow load times.

**Why this priority**: Essential for the "directory" feel and performance with large datasets.

**Independent Test**: Can be tested by scrolling through a list of 500+ items and verifying 60fps performance and correct data rendering.

**Acceptance Scenarios**:

1. **Given** a category with 100+ listings, **When** I scroll down the list, **Then** the UI remains responsive (using virtualization) and thumbnails load lazily as they enter the viewport.
2. **Given** a listing row, **When** I view it, **Then** I see the primary thumbnail, the user's name, a "Posted" timestamp, and a short text snippet.

---

### User Story 3 - Geographic & Attribute Filtering (Priority: P3)

As a user in a specific area, I want to filter the personals list by my city and other attributes (like Position or Build) so that I only see people who meet my current criteria.

**Why this priority**: Enhances the utility of the personals directory for actual meeting.

**Independent Test**: Can be tested by selecting a city (e.g., Philadelphia) and a position (e.g., Top) and verifying the list results are strictly filtered by both.

**Acceptance Scenarios**:

1. **Given** the Philadelphia Personals view, **When** I select "Philadelphia" from the location filter, **Then** only profiles with `location_city` equal to Philadelphia are shown.

### Edge Cases

- What happens when a category has zero listings? (System should show a friendly "No listings found in this category" message).
- How does the system handle a missing category icon asset? (Fall back to a generic default icon or the category name text).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a right-hand sidebar containing at least 15 categorical icons mapped to specific user metadata tags.
- **FR-002**: System MUST display a category-specific header banner (using provided PNG assets) that updates dynamically based on the active route/filter.
- **FR-003**: System MUST implement a vertical list view using virtualization (@tanstack/react-virtual) to handle 1000+ items at 60 FPS.
- **FR-004**: Each listing row MUST display: Thumbnail (max 100px), Username, "Posted" time, and a 150-character snippet (derived from the first 150 characters of the profile bio).
- **FR-005**: The sidebar MUST be responsive, moving to a mobile-friendly navigation pattern (drawer/bottom-sheet) on screens < 768px.
- **FR-006**: System MUST support hierarchical location filtering (State > City) within the personals view.

### Key Entities *(include if feature involves data)*

- **Personal Listing**: A specialized view of the `Profile` entity, specifically those with a `is_personal=True` flag or similar metadata.
- **Category**: A metadata definition including a name, slug, and associated icon/banner asset paths.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Category switching via sidebar completes in under 200ms (state update + render).
- **SC-002**: Virtualized list maintains 60 FPS during continuous scrolling on mid-range mobile devices.
- **SC-003**: Visual fidelity matches the TransX/ListCrawler layout (Right sidebar, themed headers, high-density rows) with 95% accuracy in visual regression tests.