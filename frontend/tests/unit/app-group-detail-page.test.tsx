import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GroupDetailPage from "../../src/app/(protected)/groups/[id]/page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "g1" }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
import { toast } from "sonner";

describe("GroupDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it("shows a loading state, then renders the matching group from the fetched list", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: "g0", name: "Other group", description: "nope", created_at: "2024-01-01T00:00:00Z" },
          { id: "g1", name: "My Group", description: "A group about things", created_at: "2024-01-01T00:00:00Z" },
        ]),
    });

    render(<GroupDetailPage />);

    expect(screen.getByText(/loading group details/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "My Group" })).toBeDefined();
    });
    expect(screen.getByText("A group about things")).toBeDefined();
  });

  it("shows 'Group not found' when no group in the list matches the id param", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: "other", name: "Other", description: "", created_at: "2024-01-01T00:00:00Z" }]),
    });

    render(<GroupDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/group not found/i)).toBeDefined();
    });
  });

  it("shows 'Group not found' when the fetch response is not ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    render(<GroupDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/group not found/i)).toBeDefined();
    });
  });

  it("shows 'Group not found' when fetch throws", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("network error"));

    render(<GroupDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/group not found/i)).toBeDefined();
    });
  });

  it("joins the group and shows a success toast when Join Group is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([{ id: "g1", name: "My Group", description: "d", created_at: "2024-01-01T00:00:00Z" }]),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    render(<GroupDetailPage />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "My Group" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /join group/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/groups/g1/join"),
        expect.objectContaining({ method: "POST" })
      );
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Welcome to the group!");
    });
  });

  it("shows a toast error when joining the group throws", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([{ id: "g1", name: "My Group", description: "d", created_at: "2024-01-01T00:00:00Z" }]),
      })
      .mockRejectedValueOnce(new Error("join failed"));

    render(<GroupDetailPage />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "My Group" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /join group/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to join group");
    });
  });
});
