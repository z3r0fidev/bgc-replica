# Speckit.Specify Description: Personals Section (TransX/ListCrawler Style)

## Feature Overview
Implement a dedicated "Personals" section in the BGC Replica platform that replicates the structural and navigational experience of the TransX/ListCrawler directory. This feature focuses on categorical browsing, high-density listing display, and a distinct sidebar-driven navigation system.

## Core Objectives
- **Categorical Navigation:** Implement a "Featured Lists" sidebar using custom iconography to allow users to switch between niche interest categories instantly.
- **High-Density Listings:** Create a performant, virtualized list of personals that emphasizes text descriptions and quick-view thumbnails.
- **Geographic Filtering:** Integrate a location-based filter system (City/Metro area) into the listings view.
- **Branded Experience:** Apply specific visual themes (banners and color palettes) for the "TransX" and other category views.

## Functional Requirements
- **FR-001:** Sidebar navigation showing at least 10 custom category icons (e.g., AA OK, MILFY, TransX).
- **FR-002:** Branded header banners that update based on the selected category.
- **FR-003:** Virtualized listing rows containing: Thumbnail (left), Title/Username, Timestamp, and Short Snippet.
- **FR-004:** Integration with existing discovery filters (Position, Build, HIV Status) within the Personals context.
- **FR-005:** Mobile-responsive sidebar that collapses into a bottom sheet or top drawer.

## Implementation Details
- **Frontend:** Next.js 14+, Tailwind CSS, TanStack Virtual, Framer Motion for sidebar transitions.
- **Assets:** Utilize the extracted PNG assets for icons and banners.
- **Data:** Map the `User` and `Profile` models to the Personals view, using `metadata_json` for specific categorical tagging.

## Success Criteria
- **SC-001:** Users can switch categories via the sidebar in under 200ms.
- **SC-002:** The gallery renders smoothly (60 FPS) even with 500+ simulated listings.
- **SC-003:** Visual design accurately reflects the provided reference layout and asset usage.
