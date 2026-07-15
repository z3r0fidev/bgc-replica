import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfileActions } from "../../src/components/profile/ProfileActions";

vi.mock("../../src/hooks/use-block", () => ({
  useBlock: vi.fn(),
}));

import { useBlock } from "../../src/hooks/use-block";

function openDropdown() {
  const trigger = screen.getByRole("button", { name: /more actions/i });
  fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse", ctrlKey: false });
  fireEvent.pointerUp(trigger, { button: 0, pointerType: "mouse" });
  fireEvent.click(trigger);
  return trigger;
}

function makeBlockState(overrides: Partial<ReturnType<typeof useBlock>> = {}) {
  return {
    isBlocked: false,
    blockedByMe: false,
    blockedByThem: false,
    isPending: false,
    isLoading: false,
    error: null,
    blockUser: vi.fn().mockResolvedValue(undefined),
    unblockUser: vi.fn().mockResolvedValue(undefined),
    toggleBlock: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("ProfileActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Block {userName}' when the user is not blocked by me", async () => {
    vi.mocked(useBlock).mockReturnValue(makeBlockState({ blockedByMe: false }));
    render(<ProfileActions userId="user-1" userName="Alex" />);

    openDropdown();

    expect(await screen.findByText("Block Alex")).toBeDefined();
    expect(screen.queryByText("Unblock Alex")).toBeNull();
  });

  it("shows 'Unblock {userName}' when the user is blocked by me", async () => {
    vi.mocked(useBlock).mockReturnValue(makeBlockState({ blockedByMe: true }));
    render(<ProfileActions userId="user-1" userName="Alex" />);

    openDropdown();

    expect(await screen.findByText("Unblock Alex")).toBeDefined();
    expect(screen.queryByText("Block Alex")).toBeNull();
  });

  it("always shows the Report menu item", async () => {
    vi.mocked(useBlock).mockReturnValue(makeBlockState());
    render(<ProfileActions userId="user-1" userName="Alex" />);

    openDropdown();

    expect(await screen.findByText("Report Alex")).toBeDefined();
  });

  it("clicking 'Block' opens the block confirm dialog rather than blocking immediately", async () => {
    const blockUser = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useBlock).mockReturnValue(
      makeBlockState({ blockedByMe: false, blockUser })
    );
    render(<ProfileActions userId="user-1" userName="Alex" />);

    openDropdown();
    const blockItem = await screen.findByText("Block Alex");
    fireEvent.pointerUp(blockItem);
    fireEvent.click(blockItem);

    expect(await screen.findByText("Block Alex?")).toBeDefined();
    // Should not have blocked yet - only opens the confirmation dialog
    expect(blockUser).not.toHaveBeenCalled();
  });

  it("confirming the block dialog calls blockUser", async () => {
    const blockUser = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useBlock).mockReturnValue(
      makeBlockState({ blockedByMe: false, blockUser })
    );
    render(<ProfileActions userId="user-1" userName="Alex" />);

    openDropdown();
    const blockItem = await screen.findByText("Block Alex");
    fireEvent.pointerUp(blockItem);
    fireEvent.click(blockItem);

    await screen.findByText("Block Alex?");
    const confirmButton = screen.getByRole("button", { name: /^block user$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(blockUser).toHaveBeenCalledTimes(1);
    });
  });

  it("clicking 'Unblock' calls unblockUser directly (no confirmation dialog)", async () => {
    const unblockUser = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useBlock).mockReturnValue(
      makeBlockState({ blockedByMe: true, unblockUser })
    );
    render(<ProfileActions userId="user-1" userName="Alex" />);

    openDropdown();
    const unblockItem = await screen.findByText("Unblock Alex");
    fireEvent.pointerUp(unblockItem);
    fireEvent.click(unblockItem);

    await waitFor(() => {
      expect(unblockUser).toHaveBeenCalledTimes(1);
    });
  });

  it("clicking 'Report' opens the report dialog", async () => {
    vi.mocked(useBlock).mockReturnValue(makeBlockState());
    render(<ProfileActions userId="user-1" userName="Alex" />);

    openDropdown();
    const reportItem = await screen.findByText("Report Alex");
    fireEvent.pointerUp(reportItem);
    fireEvent.click(reportItem);

    expect(await screen.findByText(/why are you reporting this user/i)).toBeDefined();
  });
});
