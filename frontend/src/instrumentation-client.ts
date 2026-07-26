// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://24e013259e2c4a9dbb6d65a3048366ba@o4510570655580160.ingest.us.sentry.io/4510581798010880",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Distributed tracing (Issue #72): the default tracePropagationTargets
  // only covers same-origin/relative requests, but src/services/*.ts call
  // NEXT_PUBLIC_API_URL directly - a different origin in every deployed
  // environment (the Railway backend), not just via the Next.js same-origin
  // /api rewrite. Without the backend's origin listed here, those direct
  // cross-origin fetches never get a sentry-trace/baggage header, breaking
  // frontend->backend trace continuity for most real requests. The backend
  // must also allow these headers via CORS (see backend/app/main.py's
  // CORSMiddleware) or the browser strips them before this ever matters.
  tracePropagationTargets: [
    /^\//,
    /^https?:\/\/(localhost|127\.0\.0\.1):8000/,
    /^https:\/\/([a-z0-9-]+\.)*up\.railway\.app/,
  ],

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Session Replay
  // Sample 10% of sessions for replay. Increase to 100% for development/testing.
  replaysSessionSampleRate: 0.1,
  // Capture 100% of sessions with errors for replay
  replaysOnErrorSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
