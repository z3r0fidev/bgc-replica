# Research: Personals Section Expansion

## Decisions

### 1. Rich-Text Editor Library
- **Decision**: Use `Tiptap` with `emoji` and `image` extensions.
- **Rationale**: Tiptap is highly customizable, headless, and works well with Tailwind CSS. It supports the required emoji and media embedding natively.
- **Alternatives Considered**: `react-quill` (rejected due to outdated dependency tree and rigid styling).

### 2. Follower Persistence Model
- **Decision**: Implement a dedicated `PostFollower` table in PostgreSQL.
- **Rationale**: While the spec mentioned user metadata, a relational table (`user_id`, `post_id`) is significantly more efficient for querying "who follows this post" and "which posts does this user follow" at scale. Metadata JSON is better for non-relational preferences.
- **Alternatives Considered**: JSONB field in `User` model (rejected for poor join performance).

### 3. Media Upload Zone
- **Decision**: Use `react-dropzone` combined with existing `StorageService`.
- **Rationale**: Provides a consistent, accessible drag-and-drop experience.
- **Limits**: Enforce 10MB per image, 50MB per video via frontend validation.

### 4. Real-time Commenting
- **Decision**: Use Socket.io rooms per post ID (`post:{id}:comments`).
- **Rationale**: Minimizes traffic by only broadcasting new comments to active viewers of that specific post.

## Best Practices

### Optimistic UI for "Follow"
- Transition the button state immediately upon click using local state (Zustand) and revert only if the API call fails.

### Threaded Comments Performance
- Limit nesting to 2 levels (Comment -> Reply) to avoid complex recursive rendering and layout shifting on mobile. Use cursor-based pagination for large comment threads.
