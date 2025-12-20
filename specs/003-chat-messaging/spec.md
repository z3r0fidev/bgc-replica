# Feature Specification: Real-Time Chat & Messaging

**Feature Branch**: `003-chat-messaging`  
**Created**: 2025-12-20  
**Status**: Draft  
**Input**: Implement real-time chat functionality, including direct messaging and public chat rooms. Support presence indicators (online/offline) and message history storage.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Direct Messaging (Priority: P1)

As a registered user, I want to send a private message to another user so that I can have a one-on-one conversation.

**Why this priority**: Fundamental social interaction requirement.

**Independent Test**: Can be tested by selecting a user from the "Connections" or "Search" list, typing a message, and verifying it appears instantly on the recipient's screen if they are online.

**Acceptance Scenarios**:

1. **Given** User A and User B are logged in, **When** User A sends a message to User B, **Then** User B receives a real-time notification/message update.
2. **Given** a direct conversation exists, **When** User A opens the chat with User B, **Then** they see the history of previous messages between them.

---

### User Story 2 - Public Chat Rooms (Priority: P1)

As a member of the community, I want to join public chat rooms (e.g., "The Lounge", "New York City") so that I can participate in group discussions.

**Why this priority**: Historical fidelity to the original BGCLive platform and key for community building.

**Independent Test**: Can be tested by navigating to the "Chat Rooms" section, entering a room, and observing the real-time stream of messages from all participants.

**Acceptance Scenarios**:

1. **Given** a list of public chat rooms, **When** a user clicks "Join" on a room, **Then** they see the real-time message feed for that specific room.
2. **Given** a user is in a chat room, **When** they send a message, **Then** all other users currently in that room see the message instantly.

---

### User Story 3 - Online Presence (Priority: P2)

As a user browsing the site, I want to see which of my friends or other community members are currently online so that I know who is available to chat.

**Why this priority**: Enhances real-time engagement and UX.

**Independent Test**: Can be tested by logging in with a second account and verifying the "Online" indicator appears on their profile/avatar in real-time.

**Acceptance Scenarios**:

1. **Given** User A is logged in, **When** User B logs in, **Then** User A sees User B's status update to "Online" on their profile card or chat list.
2. **Given** a user logs out or closes the app, **When** 1 minute has passed, **Then** their status updates to "Offline" for other users.

---

### User Story 4 - Chat Room Topics & Organization (Priority: P3)

As an administrator or user, I want chat rooms to be organized by topic or location so that I can find relevant discussions.

**Why this priority**: Improves discovery and historical fidelity.

**Independent Test**: Can be tested by verifying rooms are categorized (e.g., "Regional", "Interests", "Support").

**Acceptance Scenarios**:

1. **Given** the chat room list, **When** a user filters by category, **Then** only rooms belonging to that category are displayed.

---

### Edge Cases

- **Connectivity Loss**: What happens if a user's internet disconnects mid-chat? (System SHOULD show a "Reconnecting" indicator and queue or fail message delivery gracefully).
- **Message Spams**: How does the system handle rapid-fire messages? (System MUST implement rate-limiting to prevent flooding).
- **Joining Full Rooms**: What happens if a room has too many users? (System SHOULD inform the user or manage performance via virtualization).
- **Blocked Users**: Can a blocked user send messages to the person who blocked them? (System MUST prevent delivery of direct messages from blocked users).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support bi-directional real-time message delivery for Direct Messages and Chat Rooms.
- **FR-002**: System MUST persist all messages in the database for history retrieval.
- **FR-003**: System MUST support modern default chat rooms (e.g., "The Lounge", "Global") and dynamic regional rooms based on user concentration (e.g., suggested when > 20 active users are detected within a 50km radius).
- **FR-004**: System MUST track and broadcast user presence status (Online, Offline, Last Seen).
- **FR-005**: System MUST allow users to view the last 50 messages for both DMs and Chat Rooms upon entering.
- **FR-006**: System MUST support text-based messaging, emojis, and full media sharing (Photos and Video).
- **FR-007**: System MUST enforce block lists in Direct Messaging.

### Key Entities

- **Message**: Core content unit.
    - Fields: `id`, `sender_id`, `recipient_id` (null for rooms), `room_id` (null for DMs), `content`, `timestamp`, `type` (TEXT, SYSTEM).
- **ChatRoom**: Group discussion container.
    - Fields: `id`, `name`, `topic`, `category`, `is_public`.
- **Presence**: Transient state tracking.
    - Fields: `user_id`, `status`, `last_seen`.
- **Conversation**: Logical grouping for DMs.
    - Fields: `id`, `participant_ids`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **Latency**: 95% of messages MUST be delivered to active recipients in under 200ms.
- **SC-002**: **Persistence**: 100% of successfully sent messages MUST be retrievable from the database history.
- **SC-003**: **Presence Accuracy**: Status changes (Online/Offline) MUST propagate to other users in under 2 seconds.
- **SC-004**: **Availability**: Chat service MUST maintain 99.9% uptime during peak community hours.

## Assumptions

- **Real-time Protocol**: We will use WebSockets or a real-time service (like Supabase Realtime or Socket.io) for message broadcasting.
- **State Management**: Presence state will likely be managed via Redis or a similar high-performance key-value store for speed.
- **Legacy Rooms**: We assume the initial set of rooms will be based on the demographics identified in `RESEARCH_SUMMARY.md`.