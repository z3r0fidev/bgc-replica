# Frontend Tasks: Community Features

## Phase 3: User Story 1 - Threaded Forum Boards

- [x] T027 [P] [US1] Build Forum Category list view in `frontend/src/app/(protected)/forums/page.tsx`
- [x] T028 [US1] Build Thread list view within categories in `frontend/src/app/(protected)/forums/[category]/page.tsx`
- [x] T029 [US1] Build Threaded Discussion view with nested replies in `frontend/src/app/(protected)/forums/thread/[id]/page.tsx`
- [x] T030 [P] [US1] Create Thread/Reply creation forms with image upload support

## Phase 4: User Story 2 - Social Feed & Status Updates

- [x] T031 [US2] Build Social Feed page with Global/Following tabs in `frontend/src/app/(protected)/feed/page.tsx`
- [x] T032 [US2] Create Status Update component with image attachment and comment support
- [x] T033 [P] [US2] Implement infinite scroll for the social feed using `react-intersection-observer` (Placeholder)

## Phase 5: User Story 3 - User-Led Groups

- [x] T034 [P] [US3] Build Group Directory view in `frontend/src/app/(protected)/groups/page.tsx`
- [x] T035 [US3] Build Group Detail page with internal feed in `frontend/src/app/(protected)/groups/[id]/page.tsx`
- [x] T036 [P] [US3] Create Group creation and join logic

## Phase 6: User Story 4 - Community-Driven Moderation

- [x] T037 [US4] Implement "Report Content" dialog component usable across feed and forums
- [x] T038 [US4] Build Moderation Dashboard for admins in `frontend/src/app/(admin)/moderation/page.tsx`

## Phase N: Polish

- [x] T039 [P] Add Framer Motion animations for feed transitions and forum navigation
- [x] T040 [P] Implement skeleton loaders for feed and forum lists
- [ ] T041 E2E test for Forum posting in `frontend/tests/e2e/community-forums.spec.ts`
- [ ] T042 E2E test for Social Feed flow in `frontend/tests/e2e/community-feed.spec.ts`
