"use client";

import { useState, useCallback, useEffect } from "react";
import { blockService } from "@/services/blockService";
import { BlockStatus } from "@/types/block";

interface UseBlockOptions {
  onBlock?: () => void;
  onUnblock?: () => void;
  onError?: (error: Error) => void;
}

export function useBlock(userId: string, options: UseBlockOptions = {}) {
  const [status, setStatus] = useState<BlockStatus>({
    is_blocked: false,
    blocked_by_me: false,
    blocked_by_them: false,
  });
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch initial block status
  useEffect(() => {
    let mounted = true;

    async function fetchStatus() {
      try {
        setIsLoading(true);
        const blockStatus = await blockService.getBlockStatus(userId);
        if (mounted) {
          setStatus(blockStatus);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    if (userId) {
      fetchStatus();
    }

    return () => {
      mounted = false;
    };
  }, [userId]);

  const blockUser = useCallback(async () => {
    if (isPending || status.blocked_by_me) return;

    // Optimistic update
    const previousStatus = { ...status };
    setStatus((prev) => ({
      ...prev,
      is_blocked: true,
      blocked_by_me: true,
    }));
    setIsPending(true);

    try {
      await blockService.blockUser(userId);
      options.onBlock?.();
    } catch (err) {
      // Revert on error
      setStatus(previousStatus);
      const error = err instanceof Error ? err : new Error("Failed to block");
      setError(error);
      options.onError?.(error);
    } finally {
      setIsPending(false);
    }
  }, [userId, isPending, status, options]);

  const unblockUser = useCallback(async () => {
    if (isPending || !status.blocked_by_me) return;

    // Optimistic update
    const previousStatus = { ...status };
    setStatus((prev) => ({
      ...prev,
      is_blocked: prev.blocked_by_them,
      blocked_by_me: false,
    }));
    setIsPending(true);

    try {
      await blockService.unblockUser(userId);
      options.onUnblock?.();
    } catch (err) {
      // Revert on error
      setStatus(previousStatus);
      const error = err instanceof Error ? err : new Error("Failed to unblock");
      setError(error);
      options.onError?.(error);
    } finally {
      setIsPending(false);
    }
  }, [userId, isPending, status, options]);

  const toggleBlock = useCallback(async () => {
    if (status.blocked_by_me) {
      await unblockUser();
    } else {
      await blockUser();
    }
  }, [status.blocked_by_me, blockUser, unblockUser]);

  return {
    isBlocked: status.is_blocked,
    blockedByMe: status.blocked_by_me,
    blockedByThem: status.blocked_by_them,
    isPending,
    isLoading,
    error,
    blockUser,
    unblockUser,
    toggleBlock,
  };
}
