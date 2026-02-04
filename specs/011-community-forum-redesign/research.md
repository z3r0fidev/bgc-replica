# Research: Community Forums Re-Design

## Decisions

### 1. Hierarchical Data Model for Categories
- **Decision**: Use the **Adjacency List** model with recursive CTEs for tree retrieval.
- **Rationale**: The forum hierarchy is expected to be relatively shallow (2-3 levels). Adjacency List is the simplest to implement and maintain. Modern PostgreSQL (and SQLAlchemy) supports recursive CTEs, making "get entire tree" queries efficient enough for our scale.
- **Alternatives Considered**: 
  - **Nested Sets**: Too complex to maintain for frequent structural changes.
  - **Materialized Path**: Good for deep trees, but adds string manipulation overhead that isn't necessary for shallow forum structures.

### 2. Real-time "Active Users" Tracking
- **Decision**: Use **Redis Sets** per sub-forum (`forum:{id}:active_users`).
- **Rationale**: Sets automatically handle unique user IDs. On `join_room` (Socket.io), we `SADD` the user ID. On `leave_room` or `disconnect`, we `SREM`. `SCARD` provides the count in O(1) time.
- **Integration**: Leverage the existing `Socket.io` + `Redis` setup mentioned in the monorepo context.

### 3. Glassmorphism (Liquid Glass) Design Tokens
- **Decision**: Define a "Liquid Glass" preset in `tailwind.config.ts`.
- **Rationale**: Centralizing blur, border-opacity, and shadow tokens ensures consistency across the forum re-design and future Phase 4 work.
- **Tokens**: 
  - `glass-bg`: `rgba(255, 255, 255, 0.1)`
  - `glass-border`: `rgba(255, 255, 255, 0.2)`
  - `glass-blur`: `backdrop-blur-md` (8px) or `backdrop-blur-lg` (16px)

## Best Practices

### High-Density UI (List Performance)
- Use `@tanstack/react-virtual` for the thread list to maintain 60 FPS scrolling.
- Implement "skeleton" loaders for the tree navigation to minimize perceived latency (SC-001).

### Navigation
- Implement breadcrumbs using a recursive helper that traverses parent IDs until `parent_id` is null.
- Cache the `/api/forums/tree` response in Redis with a long TTL (invalidating only on category changes).
