# Research: Personals Section (TransX Style)

## Decisions

### 1. List Virtualization Strategy
- **Decision**: Use `@tanstack/react-virtual`.
- **Rationale**: The personals directory requires high-density information display with many items. Virtualization is essential to maintain 60 FPS scrolling on mobile devices. TanStack Virtual provides the best hook-based API for Next.js and handles dynamic heights better than `react-window`.
- **Alternatives Considered**: `react-window` (rejected due to less modern API and rigid height handling).

### 2. Mobile Sidebar Navigation
- **Decision**: Implement a responsive sidebar that transitions to a Radix UI / shadcn/ui "Drawer" (Bottom Sheet) on mobile screens (< 768px).
- **Rationale**: The iconic right sidebar is a key navigational element. On desktop, it should be persistent. On mobile, a bottom-sheet drawer preserves the "portal" feel while providing easy thumb access to category icons.
- **Alternatives Considered**: Fixed top bar (rejected as it doesn't match the ListCrawler layout).

### 3. Data Association for Personals
- **Decision**: Use `metadata_json` in the `User` model and a specific `is_personal` boolean in the `Profile` model (or inferred via a dedicated Category tagging system in `metadata_json`).
- **Rationale**: This allows us to reuse the existing `User` and `Profile` models without a major schema overhaul while still providing the necessary filtering for the Personals section.
- **Alternatives Considered**: Dedicated `Personal` table (rejected as redundant with `Profile`).

### 4. Asset Management
- **Decision**: Store the 15+ downloaded icons in `frontend/public/assets/personals/icons/` and banners in `frontend/public/assets/personals/banners/`.
- **Rationale**: Standard Next.js static asset management. Categorizing them ensures clean organization for the 15+ unique PNGs.

## Best Practices

### Next.js Performance
- Use `next/image` for thumbnails with `priority` for above-the-fold items.
- Implement server-side filtering via URL search params to ensure shareable links and SEO compatibility.

### FastAPI Scalability
- Use `selectinload` for profile relationships to prevent N+1 queries during list fetching.
- Cache the `categories` list in Redis as it changes infrequently.
