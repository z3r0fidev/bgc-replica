import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ConnectionsPage from "../../src/app/(protected)/connections/page";

describe("ConnectionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn();
  });

  it("sends the bearer token and renders friends/favorites/pending tab counts", async () => {
    localStorage.setItem("access_token", "tok-abc");
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { id: "r1", type: "FRIEND", status: "ACCEPTED", to_user_id: "user-aaaaaaaa", created_at: "2026-01-01T00:00:00Z" },
          { id: "r2", type: "FAVORITE", status: "ACCEPTED", to_user_id: "user-bbbbbbbb", created_at: "2026-01-02T00:00:00Z" },
          { id: "r3", type: "FRIEND", status: "PENDING", to_user_id: "user-cccccccc", created_at: "2026-01-03T00:00:00Z" },
        ],
      }),
    } as Response);

    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Friends (1)")).toBeDefined();
    });
    expect(screen.getByText("Favorites (1)")).toBeDefined();
    expect(screen.getByText("Requests (1)")).toBeDefined();

    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    expect((options?.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok-abc"
    );
  });

  it("shows the friend's short user id and formatted date on the Friends tab by default", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "r1",
            type: "FRIEND",
            status: "ACCEPTED",
            to_user_id: "user-aaaaaaaa",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    } as Response);
    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText("User user-aaa")).toBeDefined();
    });
  });

  it("shows the empty-state message for friends when there are none", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);
    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText("No friends yet. Start connecting!")).toBeDefined();
    });
  });

  it("shows favorites on the Favorites tab", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "f1",
            type: "FAVORITE",
            status: "ACCEPTED",
            to_user_id: "user-ffffffff",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    } as Response);
    render(<ConnectionsPage />);

    await waitFor(() => screen.getByText("Favorites (1)"));
    // Radix's TabsTrigger switches tabs on mousedown, not click.
    fireEvent.mouseDown(screen.getByText("Favorites (1)"), { button: 0 });

    await waitFor(() => {
      expect(screen.getByText("User user-fff")).toBeDefined();
    });
  });

  it("shows the empty-state message for favorites when there are none", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);
    render(<ConnectionsPage />);

    await waitFor(() => screen.getByText("Favorites (0)"));
    fireEvent.mouseDown(screen.getByText("Favorites (0)"), { button: 0 });

    await waitFor(() => {
      expect(screen.getByText("Your favorites list is empty.")).toBeDefined();
    });
  });

  it("shows the static pending requests message on the Requests tab", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);
    render(<ConnectionsPage />);

    await waitFor(() => screen.getByText("Requests (0)"));
    fireEvent.mouseDown(screen.getByText("Requests (0)"), { button: 0 });

    await waitFor(() => {
      expect(screen.getByText("No pending requests.")).toBeDefined();
    });
  });

  it("falls back to an empty relationships list when the response is not ok", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false } as Response);
    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Friends (0)")).toBeDefined();
    });
  });

  it("falls back to an empty relationships list when the fetch throws", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("network down"));
    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Friends (0)")).toBeDefined();
    });
  });

  it("tolerates a response whose items field is a truthy non-array value", async () => {
    // `data.items || []` only substitutes a fallback for falsy values, so a
    // truthy non-array `items` reaches the Array.isArray guards in the filters.
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: "not-an-array" }),
    } as Response);
    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Friends (0)")).toBeDefined();
    });
  });
});
