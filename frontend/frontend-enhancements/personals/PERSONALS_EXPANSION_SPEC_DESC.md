# Speckit.Specify Description: Personals Section Expansion (Post, Follow, Comment)

## Feature Overview
Expand the Personals section with social and interactive features inspired by the TransX/ListCrawler interface. This includes the ability for users to create new posts ("Post Now"), follow specific posts, and leave comments.

## Core Objectives
- **Content Creation**: Implement a "Post Now" feature that allows users to publish personals ads with rich text, emojis, and media attachments (images/videos).
- **Post Interaction**: Add "Follow" and "Comment" buttons to individual posts using the authentic high-fidelity button assets extracted from the reference site.
- **Social Engagement**: Implement a "Following" system to notify users of updates to posts they interact with and a threaded commenting system for community feedback.

## Functional Requirements
- **FR-001: Post Now Interface**: A modal or dedicated page featuring a rich-text editor (with emoji support) and a multi-media upload zone (pictures/videos).
- **FR-002: Follow Functionality**: A "Follow" button on every personal post. Clicking toggles the following state in user metadata and increments the post's follow count.
- **FR-003: Commenting System**: A "Comments" button that opens a threaded discussion section below the post. Supports text and basic moderation (report comment).
- **FR-004: Interactive Assets**: Utilize `postFollowBtn.png` and `commentsBtn.png` for the UI actions to ensure visual parity with the reference directory.
- **FR-005: Media Persistence**: Uploaded post media MUST be stored in Supabase and served via the existing `Media` relationship model.

## Implementation Details
- **Frontend**: Next.js App Router for post creation and detail views. Use `shadcn/ui` Dialogs for the "Post Now" interface.
- **Assets**: Reference the verified PNG assets in `frontend/public/assets/personals/buttons/`.
- **Backend**: Update `ForumThread` or create a `PersonalPost` model to handle social metadata (follows, comments count). Implement Socket.io events for real-time comment updates.

## Success Criteria
- **SC-001**: Users can create a post with 3+ images and a video in under 30 seconds.
- **SC-002**: "Follow" state transitions are persisted and reflected UI-wide in < 100ms.
- **SC-003**: The comment section handles 50+ entries without UI lag or layout shifting.
