import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import StoriesPage from "../../src/app/(protected)/stories/page";

describe("StoriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it("shows a loading state, then renders fetched stories", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            {
              id: "s1",
              title: "My Journey",
              content: "It all started when...",
              user_id: "user-12345678",
              created_at: new Date().toISOString(),
            },
          ],
        }),
    });

    render(<StoriesPage />);

    expect(screen.getByText(/flipping through pages/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("My Journey")).toBeDefined();
    });
    expect(screen.getByText("It all started when...")).toBeDefined();
    // Author label truncates the user_id to its first 8 characters.
    expect(screen.getByText(/User user-123/)).toBeDefined();
  });

  it("renders the cover image when a story has one", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            {
              id: "s1",
              title: "Cover Story",
              content: "content",
              cover_url: "https://example.com/cover.jpg",
              user_id: "user-1",
              created_at: new Date().toISOString(),
            },
          ],
        }),
    });

    render(<StoriesPage />);

    await waitFor(() => {
      expect(screen.getByAltText("Cover Story")).toBeDefined();
    });
  });

  it("shows the empty state when there are no stories", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    render(<StoriesPage />);

    await waitFor(() => {
      expect(screen.getByText(/the library is currently empty/i)).toBeDefined();
    });
  });

  it("shows the empty state when the fetch response is not ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    render(<StoriesPage />);

    await waitFor(() => {
      expect(screen.getByText(/the library is currently empty/i)).toBeDefined();
    });
  });

  it("shows the empty state and logs when fetch throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("network error"));

    render(<StoriesPage />);

    await waitFor(() => {
      expect(screen.getByText(/the library is currently empty/i)).toBeDefined();
    });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
