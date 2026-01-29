# Quickstart: Personals Section Expansion

## Development Setup

1. **Assets**:
   Verify assets exist:
   - `frontend/public/assets/personals/buttons/postFollowBtn.png`
   - `frontend/public/assets/personals/buttons/commentsBtn.png`

2. **Dependencies**:
   Install Tiptap and Dropzone:
   ```bash
   cd frontend
   npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image react-dropzone
   ```

3. **Backend Migration**:
   ```bash
   cd backend
   .\venv\Scripts\python.exe -m alembic revision --autogenerate -m "personal_posts_and_follows"
   .\venv\Scripts\python.exe -m alembic upgrade head
   ```

## Test Scenarios

### 1. Create Post with Media
- Open "Post Now".
- Type text, add emoji.
- Drop 2 images.
- Click Publish.
- Verify: Post appears in category list with working images.

### 2. Optimistic Follow
- Click "Follow".
- Verify: Button highlights and count increments *before* the API response returns (simulate slow 3G).

### 3. Threaded Comments
- Click "Comments".
- Add a top-level comment.
- Add a reply to that comment.
- Verify: 2 levels of nesting rendered correctly.
