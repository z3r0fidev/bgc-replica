# BGCLive Replication & Modernization Guide

This guide outlines the step-by-step process to clone the core functionality of BGCLive.com while utilizing a modern, high-performance tech stack.

## 1. Tech Stack Recommendation
To modernize the application for performance, scalability, and developer experience, we use:

- **Frontend:** **Next.js 16 (React 19)** with **shadcn/ui**, **Framer Motion**, **Zustand**, **TanStack Virtual**
    - *Why:* Latest SSR/RSC features, premium UI with virtualization.
- **Styling:** **Tailwind CSS 4.x**
    - *Why:* High-performance utility-first CSS.
- **Backend:** **FastAPI (Python)** with **SQLAlchemy**, **Socket.io**
    - *Why:* High-performance async APIs, scalable real-time communication.
- **Database:** **PostgreSQL** (via **Supabase**) with **Redis** for caching
    - *Why:* Relational data integrity with caching for scalability.
- **ORM (Frontend):** **Prisma 7** with **Driver Adapters** (`@prisma/adapter-pg`)
    - *Why:* Type-safe database access with optimized JavaScript-native connection pooling.
- **ORM (Backend):** **SQLAlchemy 2.x**
    - *Why:* Async-native, optimized for complex queries.
- **Storage:** **Supabase Storage** for user photos/videos.
- **Security:** **JWT**, **Rate Limiting**, **CORS**, **Zod** (Frontend), **Pydantic** (Backend).

---

## 2. Architecture & Database Schema
Core data models defined across Phase 1-5:
1.  **User**: Identity and core authentication.
2.  **Profile**: Physical stats, bio, location, and metadata.
3.  **Media**: Gallery items linked to Supabase Storage.
4.  **Relationship**: Friends (bilateral) and Favorites (unilateral).
5.  **Message**: Persistent history for DMs and Rooms.
6.  **Forum/Feed**: Hierarchical categories, threads, status updates, and group memberships.

---

## 3. Step-by-Step Implementation Guide

### Phase 1: Setup & Authentication (COMPLETED ✅)
1.  **Initialize Monorepo:** Created `frontend/` (Next.js) and `backend/` (FastAPI) structure.
2.  **Database & Caching:** Configured SQLAlchemy (PostgreSQL) and Redis integration.
3.  **Authentication:** Implemented JWT-based login/register with route protection.
4.  **PWA:** Configured manifest and responsive landing page.

### Phase 2: User Profiles & Social Graph (COMPLETED ✅)
1.  **Profile API:** Implemented endpoints for physical stats and bio management.
2.  **Image Upload:** Integrated Supabase Storage for multi-photo galleries.
3.  **Social Graph:** Implemented Friends, Favorites, and Rating system.
4.  **Discovery:** Built search interface with demographic filtering and Redis indexing.

### Phase 3: Real-Time Features (Chat) (COMPLETED ✅)
1.  **Direct Messaging**: Built a unified UI for private conversations with optimistic updates.
2.  **Chat Rooms**: Implemented dynamic and regional public channels.
3.  **Presence**: Added real-time "who is online" tracking via Redis.
4.  **Typing States**: Integrated "Typing..." indicators via WebSockets.

### Phase 4: Community Features (Forums/Feed) (COMPLETED ✅)
1.  **Discussion Boards**: Created hierarchical threaded forum boards.
2.  **Social Feed**: Implemented dual-tabbed Global/Following feeds with Fan-out-on-Write.
3.  **User Groups**: Built user-led group discovery and internal feeds.
4.  **Moderation**: Established content reporting and administrative queue dashboard.

### Phase 5: Modernization & Performance Optimization (COMPLETED ✅)
1.  **Advanced PWA**: Implemented deep-linking, share target, and 100/100 Lighthouse score.
2.  **Performance**: Integrated DOM virtualization for infinite scrolling feeds.
3.  **Optimization**: Standardized Edge Caching and offline IndexedDB persistence.

### Phase 6: Final Polish & Advanced Enhancements (COMPLETED ✅)
1.  **UI/UX Refinement**: Implemented shared layout transitions, mobile gestures, and modern "Liquid Glass" aesthetics.
2.  **API Standardization**: Standardized cursor-based pagination and advanced error handling across all endpoints.
3.  **Advanced Caching**: Implemented Redis-based cache-aside patterns for sub-50ms profile loading.
4.  **Accessibility**: Achieved WCAG 2.1 AA compliance and integrated voice command support.

### Phase 7: Production Readiness & SecOps (COMPLETED ✅)

1.  **Security Hardening**: Implemented unified Auth strategy, strict CORS, and comprehensive security headers (HSTS, CSP).

2.  **Scalability**: Integrated Celery for background tasks and implemented PostgreSQL table partitioning for high-volume data.

3.  **Real-Time Scaling**: Optimized WebSocket handlers for massive concurrency using Redis Pub/Sub.      

4.  **Operational Excellence**: Integrated OpenTelemetry for tracing and automated security scanning (SAST/DAST).


---

## 4. Comparison: Old vs. New

| Feature | BGCLive (Legacy) | Modern Replica |
| :--- | :--- | :--- |
| **Platform** | Desktop Web | Mobile-First Responsive PWA |
| **Tech** | PHP/MySQL | Next.js 16 / FastAPI / Postgres |
| **Chat** | Page Refresh / Simple AJAX | Real-time WebSockets (Socket.io) |
| **Media** | Low-res Images | Optimized High-res, Lazy Loading |
| **Auth** | Basic Cookie | JWT / OAuth / Passkeys |
| **Database** | Raw MySQL | Prisma 7 (Frontend) / SQLAlchemy (Backend) |

# Sentry Configuration Guidance

These examples should be used as guidance when configuring Sentry functionality within a project.

# Exception Catching

Use `Sentry.captureException(error)` to capture an exception and log the error in Sentry.
Use this in try catch blocks or areas where exceptions are expected

# Tracing Examples

Spans should be created for meaningful actions within an applications like button clicks, API calls, and function calls
Use the `Sentry.startSpan` function to create a span
Child spans can exist within a parent span

## Custom Span instrumentation in component actions

The `name` and `op` properties should be meaninful for the activities in the call.
Attach attributes based on relevant information and metrics from the request

```javascript
function TestComponent() {
  const handleTestButtonClick = () => {
    // Create a transaction/span to measure performance
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Test Button Click",
      },
      (span) => {
        const value = "some config";
        const metric = "some metric";

        // Metrics can be added to the span
        span.setAttribute("config", value);
        span.setAttribute("metric", metric);

        doSomething();
      },
    );
  };

  return (
    <button type="button" onClick={handleTestButtonClick}>
      Test Sentry
    </button>
  );
}
```

## Custom span instrumentation in API calls

The `name` and `op` properties should be meaninful for the activities in the call.
Attach attributes based on relevant information and metrics from the request

```javascript
async function fetchUserData(userId) {
  return Sentry.startSpan(
    {
      op: "http.client",
      name: `GET /api/users/${userId}`,
    },
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      return data;
    },
  );
}
```

# Logs

Where logs are used, ensure Sentry is imported using `import * as Sentry from "@sentry/nextjs"`
Enable logging in Sentry using `Sentry.init({  enableLogs: true })`
Reference the logger using `const { logger } = Sentry`
Sentry offers a consoleLoggingIntegration that can be used to log specific console error types automatically without instrumenting the individual logger calls

## Configuration

In NextJS the client side Sentry initialization is in `instrumentation-client.(js|ts)`, the server initialization is in `sentry.server.config.ts` and the edge initialization is in `sentry.edge.config.ts`
Initialization does not need to be repeated in other files, it only needs to happen the files mentioned above. You should use `import * as Sentry from "@sentry/nextjs"` to reference Sentry functionality

### Baseline

```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://24e013259e2c4a9dbb6d65a3048366ba@o4510570655580160.ingest.us.sentry.io/4510581798010880",

  enableLogs: true,
});
```

### Logger Integration

```javascript
Sentry.init({
  dsn: "https://24e013259e2c4a9dbb6d65a3048366ba@o4510570655580160.ingest.us.sentry.io/4510581798010880",
  integrations: [
    // send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
});
```

## Logger Examples

`logger.fmt` is a template literal function that should be used to bring variables into the structured logs.

```javascript
logger.trace("Starting database connection", { database: "users" });
logger.debug(logger.fmt`Cache miss for user: ${userId}`);
logger.info("Updated profile", { profileId: 345 });
logger.warn("Rate limit reached for endpoint", {
  endpoint: "/api/results/",
  isEnterprise: false,
});
logger.error("Failed to process payment", {
  orderId: "order_123",
  amount: 99.99,
});
logger.fatal("Database connection pool exhausted", {
  database: "users",
  activeConnections: 100,
});
```
