# Quickstart: Community Forums Re-Design

## Development Setup

1. **Database Migration**:
   Apply the hierarchy updates to the models:
   ```bash
   cd backend
   .\venv\Scripts\python.exe -m alembic revision --autogenerate -m "forum_hierarchy_and_stats"
   .\venv\Scripts\python.exe -m alembic upgrade head
   ```

2. **Seeding**:
   Seed the new hierarchical structure:
   ```bash
   cd backend
   $env:PYTHONPATH="."
   .\venv\Scripts\python.exe app/core/seed_forums_hierarchical.py
   ```

3. **Frontend Theming**:
   Ensure `tailwind.config.ts` includes the `glass` tokens defined in `research.md`.

## Integration Scenarios

### 1. Persistent Tree Navigation
- Navigate to `/forums`.
- Verify the left sidebar displays the category tree.
- Expand "Local Discussion" and click "Philadelphia".
- Verify: URL updates to `/forums/philadelphia` and content refreshes.

### 2. High-Density Thread List
- Load a sub-forum with 50+ threads.
- Verify:
  - 12+ rows are visible on a standard mobile viewport.
  - Scrolling is smooth (60 FPS).
  - Last Post avatars and relative times are correct.

### 3. Real-time Active Indicators
- Open the same forum in two different browser tabs/windows.
- Verify: The "Active Users" count increments/decrements correctly as you join/leave.
