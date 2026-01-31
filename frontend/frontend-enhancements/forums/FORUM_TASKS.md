# Tasklist: Community Forums Re-Design

## Phase 1: Data & API Updates
- [ ] **T001**: Update `ForumCategory` model to support hierarchical parents (`parent_id`).
- [ ] **T002**: Implement `GET /api/forums/tree` to return the nested category structure.
- [ ] **T003**: Add "View Count" tracking to `ForumThread` in the backend.

## Phase 2: Core Layout & Navigation
- [ ] **T004**: Create `ForumLayout` with persistent Left Sidebar navigation.
- [ ] **T005**: Implement `ForumTreeNav` component using shadcn/ui.
- [ ] **T006**: Add Breadcrumb navigation to the forum header.

## Phase 3: Thread List Enhancement
- [ ] **T007**: Re-design `ThreadRow` component for high-density information display.
- [ ] **T008**: Apply "Liquid Glass" (glassmorphism) styling to the thread list container.
- [ ] **T009**: Implement "Create Thread" Floating Action Button (FAB).

## Phase 4: Branding & Polish
- [ ] **T010**: Integrate categorical banners (Health, Support, Events) into sub-forum headers.
- [ ] **T011**: Implement real-time active user indicators via Socket.io.
- [ ] **T012**: Mobile responsiveness review for high-density columns.
