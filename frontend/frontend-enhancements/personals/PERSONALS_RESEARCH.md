# TransX Personals Section Research & Implementation Outline

**Date:** December 23, 2025
**Target Site:** `https://transx.com.listcrawler.eu/gallery/escorts/usa/pennsylvania/philadelphia/1`

## 1. Site Summary
The TransX section of ListCrawler is a niche personals directory focused on trans escorts in specific metropolitan areas (e.g., Philadelphia). It uses a "portal" style layout common in the early 2000s web directories, optimized for high-density information display and categorical browsing.

### Key Visual Identity
- **Color Palette:**
  - Background: Primary `#EEEEEE` (light gray), Sidebar/Header `#000000` (black).
  - Text/Accent: `#4C1230` (Dark Maroon/Purple) often used for branding and links.
  - Borders/Shadows: Subtle gray `#8E8E8E`.
- **Branding:** 
  - Heavy use of custom graphical headers (banners) for specific lists.
  - Iconic "TransX" typography and color scheme.

---

## 2. Structural Breakdown

### Layout Grid
- **Header:** Contains the main navigation, area selection ("Choose a Location"), and the specific brand banner (e.g., TransX Header).
- **Sidebar (Right):** "FEATURED LISTS" panel. 
  - **Structure:** Vertical stack of icons paired with text links.
  - **Icons:** Unique 32x32 or 48x48 PNG icons for each category (AA OK, MILFY, etc.).
- **Main Content Area:**
  - **Format:** List-style (vertical rows).
  - **Item (Card) Structure:**
    - **Thumbnail:** Small square image on the left.
    - **Metadata:** Title (User/Listing name), Timestamp ("Posted: 2:39 AM"), and a short text snippet.
    - **Icons:** Small overlays for "Video Available" or "Verified".

### Filtering & Navigation
- **Category Filter:** Handled primarily via the "Featured Lists" sidebar which switches the entire list context.
- **Location Filter:** Hierarchical selector (Country > State > City).
- **Pagination:** Simple numeric footer (`1 2 3 ...`).

---

## 3. Implementation Outline for BGC Replica

### Frontend (Next.js + shadcn/ui)
1.  **Layout Component:**
    - Create a `PersonalsLayout` with a fixed-width right sidebar.
    - Implement a "Sticky" header for the brand banners.
2.  **Sidebar Component:**
    - Build a `FeaturedListsSidebar` that maps category icons to filter routes.
    - Use the downloaded assets for visual fidelity.
3.  **Personals List Component:**
    - Use TanStack Virtual (`@tanstack/react-virtual`) for the long vertical list to maintain performance.
    - Style list items to match the high-density text-left-image-right/left pattern.
4.  **State Management (Zustand):**
    - Track active category (e.g., "TransX", "MILFY") and location filters.

### Backend (FastAPI)
1.  **Endpoints:**
    - `GET /api/personals/listings`: Support filtering by `category_tag` and `location`.
    - `GET /api/personals/categories`: Return the list of featured categories with their asset paths.
2.  **Data Seeding:**
    - Expand the current seeding logic to include "Personals" tags and richer descriptions matching the "Intro/Background" style of the target site.

---

## 4. Asset Manifest (To be downloaded)
- `newLogo2.png` (Main Logo)
- `transxHeader.png` (Section Banner)
- `desktopSidePanelHeader.png` (Sidebar Header)
- Sidebar Icons: `reviewed.png`, `alligator.png`, `aaok.png`, `outcall.png`, `milfy.png`, `40Up.png`, `max80.png`, `open24.png`, `yolo.png`, `candy2.png`, `carFun.png`, `ayPapiBig.png`, `fortunecookies.png`, `transX.png`, `manUp.png`.
