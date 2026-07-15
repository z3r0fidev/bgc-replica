import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GroupsPage from "../../src/app/(protected)/groups/page";

describe("GroupsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it("shows a loading state, then renders fetched groups", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            { id: "g1", name: "Group One", description: "First group" },
            { id: "g2", name: "Group Two", description: "Second group" },
          ],
        }),
    });

    render(<GroupsPage />);

    expect(screen.getByText(/loading groups/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Group One")).toBeDefined();
    });
    expect(screen.getByText("Group Two")).toBeDefined();
  });

  it("shows the empty state when there are no groups", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    render(<GroupsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no groups found/i)).toBeDefined();
    });
  });

  it("falls back to an empty list and stops loading when the response is not ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    render(<GroupsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no groups found/i)).toBeDefined();
    });
  });

  it("clears groups and stops loading when fetch throws", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("network error"));

    render(<GroupsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no groups found/i)).toBeDefined();
    });
  });

  it("re-fetches with the search query when the search input changes", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    render(<GroupsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("query="),
        expect.any(Object)
      );
    });

    fireEvent.change(screen.getByPlaceholderText(/search groups by name/i), {
      target: { value: "bookclub" },
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("query=bookclub"),
        expect.any(Object)
      );
    });
  });

  it("links each group card to its detail page", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ items: [{ id: "g1", name: "Group One", description: "d" }] }),
    });

    render(<GroupsPage />);

    await waitFor(() => {
      expect(screen.getByText("Group One")).toBeDefined();
    });

    const link = screen.getByRole("link", { name: /view group/i });
    expect(link.getAttribute("href")).toBe("/groups/g1");
  });
});
