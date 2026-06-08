# Speckit.Specify Description: Community Forums Re-Design (High-Density Modern)

## Feature Overview
Overhaul the Community Forums section to implement a high-density, categorical directory layout inspired by industry-standard community boards (XenForo/ListCrawler) while integrating modern PWA features and "Liquid Glass" aesthetics.

## Core Objectives
- **Hierarchical Navigation**: Implement a multi-level category structure (Parent > Sub-forum > Thread) with a persistent left-hand navigation tree.
- **High-Density Thread UI**: Re-design the thread list to show maximum information (Title, Author, Stats, Last Post) in a condensed vertical row format.
- **Categorical Branding**: Extend the banner system to the forums, showing topical headers (e.g., a "Health" banner for wellness forums).
- **Social Integration**: Add user avatars to "Last Post" columns and implement real-time "active users" indicators for each sub-forum.

## Functional Requirements
- **FR-001**: Nested forum hierarchy support in backend and frontend routing.
- **FR-002**: Left-side category sidebar with "Quick Jump" functionality.
- **FR-003**: Thread rows including: Status Icon, Title, Author, Reply/View counts, and Last Post user/time.
- **FR-004**: Breadcrumb navigation for deep forum paths.
- **FR-005**: Floating Action Button (FAB) for "Create Thread" on mobile and desktop.
- **FR-006**: Glassmorphism/Liquid Glass row styling consistent with Phase 4 UI.

## Implementation Details
- **Frontend**: Next.js App Router, Tailwind CSS, shadcn/ui components (Tree navigation, Hover Cards).
- **Backend**: Update `ForumCategory` and `ForumThread` models to support nesting if not already present.
- **State**: Use Zustand for tracking navigation state and read/unread status.

## Success Criteria
- **SC-001**: Navigation between deep sub-forums completes in < 150ms.
- **SC-002**: Thread list displays at least 12 threads per viewport on standard mobile screens.
- **SC-003**: 100% visual consistency with the "Liquid Glass" branding guidelines.
