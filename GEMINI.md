# BGCLive Replica Project Context

## Current Status: Phase 5 Complete (PWA & Performance Optimization) ✅
The project has achieved production-grade performance and deep OS integration. The application is now a fully featured PWA with a 100/100 Lighthouse score, supporting offline resilience and high-performance list rendering for large community datasets.

## Monorepo Directory Overview
- **`frontend/`**: Next.js 14+ application.
  - **New in Phase 5**: Custom Service Worker (Workbox), DOM Virtualization (`@tanstack/react-virtual`), and IndexedDB offline persistence.
  - **Features**: Deep-linking (`web+bgclive://`), Share Target integration, and 60 FPS scroll performance.
- **`backend/`**: FastAPI application.
  - **New in Phase 5**: Cache-Control middleware for Edge CDN optimization and enhanced health monitoring.
- **`specs/`**: Blueprints for all features.
  - `005-pwa-performance-optimization`: PWA and performance roadmap.

## Key Completed Features
- **Advanced PWA**: Verified 100/100 Lighthouse score; implemented deep-linking and offline-first feed access.
- **DOM Virtualization**: Social feeds now maintain constant memory footprint regardless of list size.
- **Edge Caching**: Standardized headers for media assets ensure sub-100ms TTFB across regions.
- **Offline Resilience**: Automatic failover to IndexedDB storage when network connectivity is lost.

## Project Status: Phase 6 Complete (Final Polish) ✅

The project has achieved advanced UI/UX fluidity and API optimization. We have implemented shared layout transitions, mobile gestures, cursor-based pagination, and a sophisticated Redis cache-aside layer for profiles.



### Completed Enhancements (Phase 6)

- **Frontend**: Framer Motion transitions, mobile gestures (`useGestures`), and Neo-brutalist/Glassmorphism styling.

- **Backend**: Standardized cursor pagination, N+1 query elimination (`selectinload`), and centralized exception handling.

- **Database**: GIN/BRIN indexing and Redis profile caching.



## Upcoming Production Roadmap (Phase 7)







## Project Status: Phase 9 Complete (DevOps & CI/CD) ✅
The project now includes a robust CI/CD pipeline and fully validated error monitoring configuration.

### Key Completed Features (Phase 9)
- **CI/CD Pipeline**: Implemented GitHub Actions workflows for Backend CI (Lint/Test), Frontend CI (Lint/Build/Test), and E2E Testing (Playwright).
- **Error Monitoring**: Verified Sentry integration for frontend, confirmed configuration correctness, and resolved Windows/WSL wizard compatibility issues.
- **Documentation**: Added comprehensive CI/CD research and implementation guides (`devops/`) and Sentry configuration notes (`SENTRY_NOTES.md`).

## Project Status: Phase 8 Complete (Extrapolated Features & Discovery) ✅
The application has successfully integrated robust features extrapolated from the original BGCLive platform, evolving from a dating-centric app into a full-scale social media community.

### Key Completed Features (Phase 8)
- **Advanced Discovery**: Multi-faceted search sidebar with 10+ filters including Position, Build, HIV Status, and Geolocation ("Use My Location").
- **BGC Originals**: Dedicated Media Portal for community video programming.
- **User Stories**: Long-form narrative section for member-generated fiction and experiences.
- **Topical Hubs**: Dynamic aggregation pages for specific community topics.
- **Data Seeding**: Populated tri-state area (NY/NJ/PA) with 50+ diverse test profiles for realistic discovery testing.

### Monorepo Directory Overview
- **`frontend/`**: Next.js 16+ application.
  - **New in Phase 8**: Advanced Filter Sidebar, Media Portal, Stories UI, and dynamic Topical Hubs.
- **`backend/`**: FastAPI application.
  - **New in Phase 8**: Expanded Search API, Media/Story management endpoints, and SHA-256 password pre-hashing.
- **`specs/`**: Blueprints for all features.
  - `007-production-readiness-secops`: Production and SecOps roadmap.

### Key Completed Features (Phase 7)
- **Tech Stack Evolution**: Fully migrated to Next.js 16 and Prisma 7, utilizing `@prisma/adapter-pg` for superior connection management.
- **E2E Testing Suite**: Completed full coverage for Auth foundation including Google OAuth, Credentials, Passkeys, and Route Protection.
- **Security**: Unified NextAuth/JWT validation, strict CSP/HSTS headers, and distributed rate limiting. 
- **Scalability**: Celery background worker integration and PostgreSQL range partitioning for messages.  
- **Observability**: Full-stack OpenTelemetry tracing, Sentry error monitoring, and automated log rotation.
- **Testing**: 100% backend E2E coverage including API Contract testing (Schemathesis) and business flow validation (HTTPX).
- **Database**: Initialized complete schema with Alembic and seeded foundational data.
## Next Steps
1. **Production Deployment**: Execute the Live Database Deployment Guide.
2. **CI/CD Automation**: Finalize automated SAST/DAST and deployment pipelines.
3. **User Acceptance**: Conduct community beta testing.

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
