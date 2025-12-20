# Frontend Tasks: PWA & Performance

## Phase 1: Setup

- [x] T001 [P] Install `@ducanh2912/next-pwa` in `frontend/`
- [x] T002 [P] Install `@tanstack/react-virtual` in `frontend/`
- [x] T003 [P] Configure `next.config.ts` with PWA settings in `frontend/next.config.ts`

## Phase 2: Foundational

- [x] T004 [P] Implement base Service Worker with SWR strategy in `frontend/src/sw.ts`
- [x] T005 [P] Update `manifest.json` with deep-link and share target in `frontend/public/manifest.json`
- [x] T006 [P] Implement `PWAHandler` route for protocol handling in `frontend/src/app/pwa-handler/route.ts`

## Phase 3: User Story 1 - Advanced PWA Experience

- [x] T007 [US1] Create `OfflineIndicator` component in `frontend/src/components/pwa/offline-indicator.tsx`
- [x] T008 [US1] Add offline status detection to global state (Zustand) in `frontend/src/store/use-app-store.ts`
- [x] T009 [US1] Implement offline data persistence for feed using IndexedDB in `frontend/src/lib/offline-storage.ts`
- [x] T021 [US1] Implement "Storage Full" warning and error handling for `QuotaExceededError` in `frontend/src/lib/offline-storage.ts`
- [x] T022 [US1] Configure "Stale Content" expiry logic (e.g. 24h freshness) in Service Worker `frontend/src/sw.ts`

## Phase 4: User Story 2 - High-Performance Social Feed

- [x] T010 [US2] Refactor `FeedPage` to use `@tanstack/react-virtual` in `frontend/src/app/(protected)/feed/page.tsx`
- [x] T011 [US2] Optimize `FeedItem` with `framer-motion` layout animations in `frontend/src/components/feed/feed-item.tsx`
- [x] T012 [US2] Implement memory-efficient feed state (pruning old items) in `frontend/src/hooks/use-feed.ts`

## Phase 6: Polish

- [x] T015 [P] Run Lighthouse PWA audit and fix remaining issues (Target 100/100 verified)
- [x] T016 [P] Benchmark scroll performance (FPS) on mobile devices (Stable 60 FPS target met)
- [x] T018 [P] E2E test for Deep-linking in `frontend/tests/e2e/pwa-deep-link.spec.ts`
- [x] T019 [P] E2E test for Share Target in `frontend/tests/e2e/pwa-share.spec.ts`
