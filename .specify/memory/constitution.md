<!--
Sync Impact Report:
- Version Change: 0.0.0 -> 1.0.0
- List of Modified Principles:
  - Added: I. Mobile-First PWA
  - Added: II. Historical Fidelity
  - Added: III. Modern Tech Stack (T3)
  - Added: IV. Community Safety & Moderation
  - Added: V. Progressive Disclosure
- Added Sections: Governance
- Removed Sections: None (Template placeholders replaced)
- Templates Requiring Updates: None (Standard templates align with these principles)
- Follow-up TODOs: None
-->
# BGCLive Replica Constitution

## Core Principles

### I. Mobile-First PWA
The application MUST be designed and built as a Progressive Web App (PWA) with a mobile-first mindset. All UI/UX decisions must prioritize small screens, touch interactions, and offline capabilities before desktop adaptations. This ensures accessibility for the modern user base who primarily access social networks via smartphones.

### II. Historical Fidelity
The core features (Profiles, Chat Rooms, Forums/Feed, Galleries) MUST functionally replicate the experience of the original BGCLive.com while adapting the interface for modern standards. We preserve the "spirit" of the community interactions (e.g., directness, specific demographic focus) even if the exact pixel-perfect UI is updated.

### III. Modern Tech Stack (FastAPI + Next.js)
Development MUST adhere to the established architecture: Next.js (React) for the frontend, FastAPI (Python) for the backend, Tailwind CSS for styling, PostgreSQL (via Supabase) for primary data, SQLAlchemy for ORM, and Redis for caching and high-performance indexing. This polyglot approach ensures high-performance async APIs and a modern, responsive UI. Deviations require explicit architectural justification.

### IV. Community Safety & Moderation
Given the social nature of the application, safety features (blocking, reporting, moderation tools) are NOT optional add-ons but core requirements. Every interactive feature (chat, posts, comments) MUST have a corresponding safety mechanism designed alongside it.

### V. Progressive Disclosure
Implementation MUST follow a phased approach: (1) Auth & Foundation, (2) User Profiles, (3) Real-time Chat, (4) Community Features. We do not build "everything at once." Each phase must result in a stable, testable deliverable before moving to the next complex domain.

## Governance

**Amendments**:
This constitution is the supreme architectural law of the project. Amendments require a clear rationale and must be reflected in the project's version history.

**Compliance**:
All feature specifications and implementation plans must explicitly state how they adhere to these principles. Code reviews must verify compliance with the Tech Stack and Mobile-First mandates.

**Versioning**:
We follow semantic versioning for this document. Major version bumps represent fundamental shifts in project goals or tech stack.

**Version**: 1.0.0 | **Ratified**: 2025-12-20 | **Last Amended**: 2025-12-20