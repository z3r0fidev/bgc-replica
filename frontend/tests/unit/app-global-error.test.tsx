import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import * as Sentry from "@sentry/nextjs";
import GlobalError from "../../src/app/global-error";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("next/error", () => ({
  default: () => null,
}));

describe("GlobalError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports the error to Sentry on mount", () => {
    const error = new Error("boom") as Error & { digest?: string };
    render(<GlobalError error={error} />, {
      container: document.createElement("div"),
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it("re-reports when a new error instance is passed via rerender", () => {
    const error1 = new Error("first") as Error & { digest?: string };
    const { rerender } = render(<GlobalError error={error1} />, {
      container: document.createElement("div"),
    });
    expect(Sentry.captureException).toHaveBeenCalledWith(error1);

    const error2 = new Error("second") as Error & { digest?: string };
    rerender(<GlobalError error={error2} />);

    expect(Sentry.captureException).toHaveBeenCalledWith(error2);
    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
  });
});
