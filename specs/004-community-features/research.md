# Research: Community Features

## 1. Hierarchical Forum Threads

**Decision**: Use the **Adjacency List** pattern in SQLAlchemy for forum threads and replies.

**Rationale**:
- **Native Support**: SQLAlchemy's self-referential relationships provide a clean way to model parent-child hierarchies.
- **Flexibility**: Supports arbitrary depth (though we will limit to 2-3 levels for mobile UI).
- **Efficiency**: Allows fetching a thread and its direct replies in a single query or via recursive CTEs if deep nesting is needed.

**Alternatives Considered**:
- *Flat List with Reference*: Too difficult to represent conversation flow.
- *Nested Sets*: Faster reads for deep trees but extremely complex and slow for frequent updates/writes.

## 2. Social Feed Aggregation

**Decision**: Implement a **Fan-out-on-Write (Push Model)** using Redis ZSETs and FastAPI Background Tasks.

**Rationale**:
- **Performance**: Pre-computing personalized "Following" feeds ensures sub-second load times (< 1.5s SC-002) for users.
- **Scalability**: Redis Sorted Sets (ZSETs) automatically maintain chronological order using timestamps as scores.
- **Workflow**:
  1. User A posts a status update.
  2. Background task retrieves User A's followers.
  3. Background task adds Post ID to each follower's personalized Redis ZSET.
  4. Global feed is maintained in a separate `feed:global` ZSET.

**Alternatives Considered**:
- *Fan-out-on-Read (Pull Model)*: Becomes prohibitively slow as users follow more people (merging multiple ZSETs at runtime).

## 3. Moderation Thresholds

**Decision**: **Threshold-based Escalation** with Multi-tiered Prioritization.

**Rationale**:
- **Fidelity**: Replicates community-driven standards while protecting against abuse.
- **Logic**:
  - `status = VISIBLE` (Default).
  - Report received -> Increment `report_count`.
  - `report_count >= 5` -> Flag for high priority in `ModerationQueue`.
  - Severe categories (e.g., Illegal) trigger immediate high-priority flagging regardless of count.
- **Moderator Dashboard**: Sorted by `report_count` and `severity`.
