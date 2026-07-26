import { describe, it, expect, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({ name: "Replay" })),
  captureRouterTransitionStart: vi.fn(),
}));

describe("instrumentation-client", () => {
  it("configures tracePropagationTargets to cover same-origin and the Railway backend, but not arbitrary origins (Issue #72)", async () => {
    await import("../../src/instrumentation-client");

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const options = (Sentry.init as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const targets: Array<string | RegExp> = options.tracePropagationTargets;

    const matches = (url: string) => targets.some((t) => (typeof t === "string" ? url.includes(t) : t.test(url)));

    // Same-origin /api rewrite path.
    expect(matches("/api/profiles/me")).toBe(true);
    // Local backend during development.
    expect(matches("http://127.0.0.1:8000/api/profiles/me")).toBe(true);
    // Deployed backend - src/services/*.ts call NEXT_PUBLIC_API_URL directly,
    // a different origin than the frontend in every real environment.
    expect(matches("https://bgc-live-production.up.railway.app/api/profiles/me")).toBe(true);
    // Anything else should NOT get trace headers attached - carelessly
    // widening this leaks trace context to third parties.
    expect(matches("https://evil.example.com/api/profiles/me")).toBe(false);
  });
});
