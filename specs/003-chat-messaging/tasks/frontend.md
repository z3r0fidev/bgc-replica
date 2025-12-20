# Frontend Tasks: Real-Time Chat & Messaging

## Phase 1: Setup

- [x] T024 [P] Install `socket.io-client` in `frontend/`
- [x] T025 [P] Create `useChat` custom hook for WebSocket connection and event handling in `frontend/src/hooks/use-chat.ts`
- [x] T026 [P] Configure WebSocket provider in `frontend/src/app/layout.tsx` (if global context needed)

## Phase 3: User Story 1 - Direct Messaging

- [x] T027 [US1] Build DM List view in `frontend/src/app/(protected)/chat/page.tsx`
- [x] T028 [US1] Build Direct Chat window component in `frontend/src/components/chat/chat-window.tsx`
- [x] T029 [US1] Implement optimistic UI updates for sent messages

## Phase 4: User Story 2 - Public Chat Rooms

- [x] T030 [US2] Build Chat Room List view in `frontend/src/app/(protected)/rooms/page.tsx`
- [x] T031 [US2] Build Room Chat interface with participant list in `frontend/src/app/(protected)/rooms/[id]/page.tsx`
- [x] T032 [P] [US2] Implement media upload logic (using T040) and preview support in chat stream

## Phase 5: User Story 3 - Online Presence

- [x] T033 [US3] Build `PresenceIndicator` component for avatars and profile cards
- [x] T034 [US3] Integrate presence updates with the `useChat` hook

## Phase 6: Polish

- [x] T035 [P] Implement "Typing..." indicator UI in `frontend/src/components/chat/typing-indicator.tsx`
- [x] T036 [P] Add Framer Motion animations for message appearance and list transitions
- [x] T037 [P] Implement swipe-to-navigate for media galleries in chat (mobile)
- [x] T038 E2E test for DM flow in `frontend/tests/e2e/chat-dm.spec.ts`
- [x] T039 E2E test for Chat Room flow in `frontend/tests/e2e/chat-rooms.spec.ts`
