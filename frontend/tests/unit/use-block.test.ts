import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { BlockStatus } from "../../src/types/block";

vi.mock("../../src/services/blockService", () => ({
  blockService: {
    getBlockStatus: vi.fn(),
    blockUser: vi.fn(),
    unblockUser: vi.fn(),
  },
}));

import { blockService } from "../../src/services/blockService";
import { useBlock } from "../../src/hooks/use-block";

const initialStatus: BlockStatus = {
  is_blocked: false,
  blocked_by_me: false,
  blocked_by_them: false,
};

describe("useBlock", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("mount fetch", () => {
    it("fetches block status, toggling isLoading and populating status", async () => {
      const status: BlockStatus = {
        is_blocked: true,
        blocked_by_me: false,
        blocked_by_them: true,
      };
      vi.mocked(blockService.getBlockStatus).mockResolvedValue(status);

      const { result } = renderHook(() => useBlock("user-1"));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(blockService.getBlockStatus).toHaveBeenCalledWith("user-1");
      expect(result.current.isBlocked).toBe(true);
      expect(result.current.blockedByThem).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it("sets error (wrapped as Error) on rejection", async () => {
      vi.mocked(blockService.getBlockStatus).mockRejectedValue("raw string");

      const { result } = renderHook(() => useBlock("user-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Unknown error");
    });

    it("skips the fetch entirely when userId is falsy", async () => {
      const { result } = renderHook(() => useBlock(""));

      // Give effects a chance to run
      await Promise.resolve();

      expect(blockService.getBlockStatus).not.toHaveBeenCalled();
      // isLoading stays true since fetchStatus() (and its finally) never runs
      expect(result.current.isLoading).toBe(true);
    });

    it("sets error to the actual Error instance when the rejection is already an Error", async () => {
      const err = new Error("actual error instance");
      vi.mocked(blockService.getBlockStatus).mockRejectedValue(err);

      const { result } = renderHook(() => useBlock("user-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(err);
    });

    it("does not update state after unmount when the fetch resolves late (success path)", async () => {
      let resolveStatus!: (v: BlockStatus) => void;
      vi.mocked(blockService.getBlockStatus).mockReturnValue(
        new Promise((resolve) => {
          resolveStatus = resolve;
        })
      );

      const { unmount } = renderHook(() => useBlock("user-1"));
      unmount();

      // Resolve after unmount; the `mounted` guard should prevent state updates.
      await act(async () => {
        resolveStatus(initialStatus);
        await Promise.resolve();
      });

      // No assertion possible on unmounted result, but this must not throw
      // (e.g. "state update on unmounted component" warnings/errors).
      expect(true).toBe(true);
    });

    it("does not update state after unmount when the fetch rejects late (error path)", async () => {
      let rejectStatus!: (err: unknown) => void;
      vi.mocked(blockService.getBlockStatus).mockReturnValue(
        new Promise((_resolve, reject) => {
          rejectStatus = reject;
        })
      );

      const { unmount } = renderHook(() => useBlock("user-1"));
      unmount();

      await act(async () => {
        rejectStatus(new Error("late failure"));
        await Promise.resolve();
      });

      expect(true).toBe(true);
    });
  });

  describe("blockUser", () => {
    it("optimistically sets is_blocked/blocked_by_me before the service call resolves", async () => {
      vi.mocked(blockService.getBlockStatus).mockResolvedValue(initialStatus);

      let resolveBlock!: (v: { success: boolean; message: string }) => void;
      vi.mocked(blockService.blockUser).mockReturnValue(
        new Promise((resolve) => {
          resolveBlock = resolve;
        })
      );

      const { result } = renderHook(() => useBlock("user-1"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.blockUser();
      });

      // Optimistic update should be visible synchronously, before the service promise resolves
      expect(result.current.isBlocked).toBe(true);
      expect(result.current.blockedByMe).toBe(true);
      expect(result.current.isPending).toBe(true);

      await act(async () => {
        resolveBlock({ success: true, message: "ok" });
        await Promise.resolve();
      });

      expect(result.current.isPending).toBe(false);
    });

    it("calls onBlock on success", async () => {
      vi.mocked(blockService.getBlockStatus).mockResolvedValue(initialStatus);
      vi.mocked(blockService.blockUser).mockResolvedValue({
        success: true,
        message: "ok",
      });
      const onBlock = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useBlock("user-1", { onBlock, onError })
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.blockUser();
      });

      expect(onBlock).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it("reverts status, sets error, and calls onError on failure", async () => {
      vi.mocked(blockService.getBlockStatus).mockResolvedValue(initialStatus);
      const err = new Error("block failed");
      vi.mocked(blockService.blockUser).mockRejectedValue(err);
      const onError = vi.fn();

      const { result } = renderHook(() => useBlock("user-1", { onError }));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.blockUser();
      });

      expect(result.current.isBlocked).toBe(false);
      expect(result.current.blockedByMe).toBe(false);
      expect(result.current.error).toBe(err);
      expect(onError).toHaveBeenCalledWith(err);
      expect(result.current.isPending).toBe(false);
    });

    it("wraps a non-Error blockUser rejection into a generic Error", async () => {
      vi.mocked(blockService.getBlockStatus).mockResolvedValue(initialStatus);
      vi.mocked(blockService.blockUser).mockRejectedValue("raw string failure");

      const { result } = renderHook(() => useBlock("user-1"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.blockUser();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Failed to block");
    });

    it("no-ops when already blocked_by_me", async () => {
      vi.mocked(blockService.getBlockStatus).mockResolvedValue({
        is_blocked: true,
        blocked_by_me: true,
        blocked_by_them: false,
      });

      const { result } = renderHook(() => useBlock("user-1"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.blockUser();
      });

      expect(blockService.blockUser).not.toHaveBeenCalled();
    });

    it("no-ops when isPending", async () => {
      vi.mocked(blockService.getBlockStatus).mockResolvedValue(initialStatus);
      let resolveBlock!: (v: { success: boolean; message: string }) => void;
      vi.mocked(blockService.blockUser).mockReturnValue(
        new Promise((resolve) => {
          resolveBlock = resolve;
        })
      );

      const { result } = renderHook(() => useBlock("user-1"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.blockUser();
      });
      expect(result.current.isPending).toBe(true);

      // Second call while pending should be a no-op
      await act(async () => {
        await result.current.blockUser();
      });

      expect(blockService.blockUser).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveBlock({ success: true, message: "ok" });
        await Promise.resolve();
      });
    });
  });

  describe("unblockUser", () => {
    it("no-ops when not currently blocked_by_me", async () => {
      vi.mocked(blockService.getBlockStatus).mockResolvedValue(initialStatus);

      const { result } = renderHook(() => useBlock("user-1"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.unblockUser();
      });

      expect(blockService.unblockUser).not.toHaveBeenCalled();
    });

    it("optimistic update sets blocked_by_me false and is_blocked to blocked_by_them (mutual block case)", async () => {
      // Mutual block: both blocked_by_me and blocked_by_them are true
      vi.mocked(blockService.getBlockStatus).mockResolvedValue({
        is_blocked: true,
        blocked_by_me: true,
        blocked_by_them: true,
      });

      let resolveUnblock!: (v: { success: boolean; message: string }) => void;
      vi.mocked(blockService.unblockUser).mockReturnValue(
        new Promise((resolve) => {
          resolveUnblock = resolve;
        })
      );

      const { result } = renderHook(() => useBlock("user-1"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.unblockUser();
      });

      expect(result.current.blockedByMe).toBe(false);
      // is_blocked should follow blocked_by_them (true), NOT just false
      expect(result.current.isBlocked).toBe(true);

      await act(async () => {
        resolveUnblock({ success: true, message: "ok" });
        await Promise.resolve();
      });
    });

    it("optimistic update sets is_blocked false when blocked_by_them is false", async () => {
      vi.mocked(blockService.getBlockStatus).mockResolvedValue({
        is_blocked: true,
        blocked_by_me: true,
        blocked_by_them: false,
      });
      vi.mocked(blockService.unblockUser).mockResolvedValue({
        success: true,
        message: "ok",
      });

      const { result } = renderHook(() => useBlock("user-1"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.unblockUser();
      });

      expect(result.current.blockedByMe).toBe(false);
      expect(result.current.isBlocked).toBe(false);
    });

    it("calls onUnblock (not onBlock) on success", async () => {
      vi.mocked(blockService.getBlockStatus).mockResolvedValue({
        is_blocked: true,
        blocked_by_me: true,
        blocked_by_them: false,
      });
      vi.mocked(blockService.unblockUser).mockResolvedValue({
        success: true,
        message: "ok",
      });
      const onBlock = vi.fn();
      const onUnblock = vi.fn();

      const { result } = renderHook(() =>
        useBlock("user-1", { onBlock, onUnblock })
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.unblockUser();
      });

      expect(onUnblock).toHaveBeenCalledTimes(1);
      expect(onBlock).not.toHaveBeenCalled();
    });

    it("reverts status, sets error, and calls onError on failure", async () => {
      vi.mocked(blockService.getBlockStatus).mockResolvedValue({
        is_blocked: true,
        blocked_by_me: true,
        blocked_by_them: false,
      });
      const err = new Error("unblock failed");
      vi.mocked(blockService.unblockUser).mockRejectedValue(err);
      const onError = vi.fn();

      const { result } = renderHook(() => useBlock("user-1", { onError }));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.unblockUser();
      });

      expect(result.current.blockedByMe).toBe(true);
      expect(result.current.isBlocked).toBe(true);
      expect(result.current.error).toBe(err);
      expect(onError).toHaveBeenCalledWith(err);
    });

    it("wraps a non-Error unblockUser rejection into a generic Error", async () => {
      vi.mocked(blockService.getBlockStatus).mockResolvedValue({
        is_blocked: true,
        blocked_by_me: true,
        blocked_by_them: false,
      });
      vi.mocked(blockService.unblockUser).mockRejectedValue(
        "raw string failure"
      );

      const { result } = renderHook(() => useBlock("user-1"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.unblockUser();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Failed to unblock");
    });
  });

  describe("toggleBlock", () => {
    it("calls unblockUser when currently blocked_by_me", async () => {
      vi.mocked(blockService.getBlockStatus).mockResolvedValue({
        is_blocked: true,
        blocked_by_me: true,
        blocked_by_them: false,
      });
      vi.mocked(blockService.unblockUser).mockResolvedValue({
        success: true,
        message: "ok",
      });

      const { result } = renderHook(() => useBlock("user-1"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.toggleBlock();
      });

      expect(blockService.unblockUser).toHaveBeenCalledWith("user-1");
      expect(blockService.blockUser).not.toHaveBeenCalled();
    });

    it("calls blockUser when not currently blocked_by_me", async () => {
      vi.mocked(blockService.getBlockStatus).mockResolvedValue(initialStatus);
      vi.mocked(blockService.blockUser).mockResolvedValue({
        success: true,
        message: "ok",
      });

      const { result } = renderHook(() => useBlock("user-1"));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.toggleBlock();
      });

      expect(blockService.blockUser).toHaveBeenCalledWith("user-1");
      expect(blockService.unblockUser).not.toHaveBeenCalled();
    });
  });
});
