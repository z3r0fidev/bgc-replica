# Quickstart: Personals Section

## Development Setup

1. **Assets**:
   Ensure all downloaded PNG assets are moved to `frontend/public/assets/personals/`.
   - Icons: `reviewed.png`, `transX.png`, etc.
   - Banners: `transxHeader.png`.

2. **Database Seeding**:
   Run the expanded profile seed to create test data with personals metadata:
   ```bash
   cd backend
   .\venv\Scripts\python.exe scripts/seed_expanded_profiles.py
   ```

3. **Frontend**:
   Navigate to the personals route:
   ```bash
   # URL structure
   http://localhost:3000/personals
   http://localhost:3000/personals/transx
   ```

## Test Scenarios

### 1. Category Switching
- Click "MILFY" in the sidebar.
- Verify:
  - Header banner changes.
  - List refreshes with MILFY profiles.
  - URL updates to `/personals/milfy`.

### 2. High-Density Scroll
- Scroll through the list.
- Verify:
  - 60 FPS performance (use Chrome DevTools).
  - Images load lazily.

### 3. Mobile View
- Switch to mobile inspection mode.
- Verify:
  - Sidebar is hidden or accessible via a Drawer.
  - Layout remains high-density but readable.
