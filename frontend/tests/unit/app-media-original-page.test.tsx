import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import OriginalProgrammingPage from "../../src/app/(protected)/media/original/page";

function mockFetchSequence(
  responses: Array<{ ok: boolean; json?: unknown } | "reject">
) {
  const fn = vi.fn();
  for (const r of responses) {
    if (r === "reject") {
      fn.mockImplementationOnce(() => Promise.reject(new Error("network down")));
    } else {
      fn.mockImplementationOnce(() =>
        Promise.resolve({ ok: r.ok, json: () => Promise.resolve(r.json) })
      );
    }
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe("OriginalProgrammingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows a loading indicator before media arrives", () => {
    mockFetchSequence([{ ok: true, json: { items: [] } }]);
    render(<OriginalProgrammingPage />);
    expect(screen.getByText("Broadcasting original content...")).toBeDefined();
  });

  it("renders media items with title, description, and formatted date", async () => {
    mockFetchSequence([
      {
        ok: true,
        json: {
          items: [
            {
              id: "m1",
              url: "https://cdn.example.com/vid.mp4",
              title: "Community Spotlight",
              description: "A special feature",
              type: "VIDEO",
              created_at: "2026-01-01T00:00:00Z",
            },
          ],
        },
      },
    ]);

    render(<OriginalProgrammingPage />);

    await waitFor(() => {
      expect(screen.getByText("Community Spotlight")).toBeDefined();
    });
    expect(screen.getByText("A special feature")).toBeDefined();
    expect(screen.getByText("HD")).toBeDefined();
  });

  it("falls back to default title/description text when missing", async () => {
    mockFetchSequence([
      {
        ok: true,
        json: {
          items: [
            {
              id: "m2",
              url: "https://cdn.example.com/img.png",
              created_at: "2026-01-01T00:00:00Z",
            },
          ],
        },
      },
    ]);

    render(<OriginalProgrammingPage />);

    await waitFor(() => {
      expect(screen.getByText("Community Highlight")).toBeDefined();
    });
    expect(
      screen.getByText(
        "Tune in to the latest original content from across the BGC network."
      )
    ).toBeDefined();
    expect(screen.queryByText("HD")).toBeNull();
  });

  it("shows the empty state when there is no media", async () => {
    mockFetchSequence([{ ok: true, json: { items: [] } }]);

    render(<OriginalProgrammingPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Original Programming Coming Soon")
      ).toBeDefined();
    });
  });

  it("recovers to the empty state when the fetch rejects", async () => {
    mockFetchSequence(["reject"]);

    render(<OriginalProgrammingPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Original Programming Coming Soon")
      ).toBeDefined();
    });
  });

  it("shows the empty state when the media request is not ok", async () => {
    mockFetchSequence([{ ok: false, json: {} }]);

    render(<OriginalProgrammingPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Original Programming Coming Soon")
      ).toBeDefined();
    });
  });

  it("falls back to an empty media list when the response has no items field", async () => {
    mockFetchSequence([{ ok: true, json: {} }]);

    render(<OriginalProgrammingPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Original Programming Coming Soon")
      ).toBeDefined();
    });
  });
});
