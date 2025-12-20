# Tasks: Community Features

**Input**: Design documents from `/specs/004-community-features/`
**Organization**: Tasks are split by domain for clarity. See files in `./tasks/` for details.

## Implementation Strategy

### 1. MVP Scope (Phase 2-4)
Establish the core community foundation: Database schema, Social Feed, and Threaded Forums.
- [x] Complete Database Schema & Seeding (T001-T007)
- [x] Complete Foundational Services (T010-T012)
- [x] Implement Forums (T013-T015, T027-T030)
- [x] Implement Social Feed (T016-T018, T031-T033)

### 2. Incremental Delivery
- [x] Add User-Led Groups (Phase 5)
- [x] Add Community Moderation Tools (Phase 6)
- [ ] Polish & Performance (Phase N)

---

## Domain Task Lists

- [x] [Backend Tasks](./tasks/backend.md)
- [x] [Frontend Tasks](./tasks/frontend.md)
- [x] [Database Tasks](./tasks/database.md)

---

## Dependencies & Execution Order

### Sequence Graph
```text
Phase 2 (Schema & Services)
  ↓
Phase 3 (Threaded Forums) + Phase 4 (Social Feed) 
  ↓
Phase 5 (User Groups)
  ↓
Phase 6 (Moderation)
  ↓
Phase N (Polish & E2E)
```

### Parallel Opportunities
- Frontend UI development (T027-T036) can proceed in parallel with Backend API implementation (T013-T023) once schemas are established.
- Moderation features (Phase 6) can be built independently of User Groups (Phase 5).
- All tasks marked with **[P]** in domain files.

---

## Progress Summary
- Total Tasks: 42
- Backend: 17
- Frontend: 16
- Database: 9
- **Status**: Ready for implementation.
