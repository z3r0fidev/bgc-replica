import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BlockedUsersPage from "../../src/app/(protected)/settings/blocked/page";
import { blockService } from "../../src/services/blockService";
import type { BlockedUser } from "../../src/types/block";

vi.mock("../../src/services/blockService", () => ({
  blockService: {
    getBlockedUsers: vi.fn(),
    unblockUser: vi.fn(),
  },
}));

function makeBlockedUser(overrides: Partial<BlockedUser> = {}): BlockedUser {
  return {
    id: "block-1",
    user: {
      id: "user-1",
      name: "Jane Doe",
      email: "jane@example.com",
      image: null,
    },
    blocked_at: "2026-01-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("BlockedUsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows skeleton loading state initially", () => {
    vi.mocked(blockService.getBlockedUsers).mockReturnValue(new Promise(() => {}));
    const { container } = render(<BlockedUsersPage />);
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
  });

  it("shows the empty state when there are no blocked users", async () => {
    vi.mocked(blockService.getBlockedUsers).mockResolvedValue([]);
    render(<BlockedUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("No blocked users")).toBeDefined();
    });
  });

  it("renders blocked users with name, initials fallback, and formatted date", async () => {
    vi.mocked(blockService.getBlockedUsers).mockResolvedValue([
      makeBlockedUser(),
      makeBlockedUser({
        id: "block-2",
        user: { id: "user-2", name: null, email: null, image: null },
      }),
    ]);
    render(<BlockedUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeDefined();
    });
    expect(screen.getByText("Unknown User")).toBeDefined();
    expect(screen.getAllByText(/Blocked on/).length).toBe(2);
  });

  it("shows an error message when fetching fails with an Error", async () => {
    vi.mocked(blockService.getBlockedUsers).mockRejectedValue(
      new Error("Network down")
    );
    render(<BlockedUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Network down")).toBeDefined();
    });
  });

  it("shows a generic error message when a non-Error is thrown", async () => {
    vi.mocked(blockService.getBlockedUsers).mockRejectedValue("boom");
    render(<BlockedUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load blocked users")).toBeDefined();
    });
  });

  it("unblocks a user and removes them from the list", async () => {
    vi.mocked(blockService.getBlockedUsers).mockResolvedValue([makeBlockedUser()]);
    vi.mocked(blockService.unblockUser).mockResolvedValue({
      success: true,
      message: "Unblocked",
    });
    render(<BlockedUsersPage />);

    await waitFor(() => expect(screen.getByText("Jane Doe")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /unblock/i }));

    await waitFor(() => {
      expect(blockService.unblockUser).toHaveBeenCalledWith("user-1");
      expect(screen.queryByText("Jane Doe")).toBeNull();
    });
  });

  it("shows an error when unblocking fails", async () => {
    vi.mocked(blockService.getBlockedUsers).mockResolvedValue([makeBlockedUser()]);
    vi.mocked(blockService.unblockUser).mockRejectedValue(new Error("Unblock failed"));
    render(<BlockedUsersPage />);

    await waitFor(() => expect(screen.getByText("Jane Doe")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /unblock/i }));

    await waitFor(() => {
      expect(screen.getByText("Unblock failed")).toBeDefined();
    });
    // User should remain in the list since the unblock failed.
    expect(screen.getByText("Jane Doe")).toBeDefined();
  });
});
