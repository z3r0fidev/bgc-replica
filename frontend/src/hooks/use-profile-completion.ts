"use client";

import { useState, useEffect, useCallback } from "react";
import { ProfileCompletion } from "@/types/profile";
import { profileService } from "@/services/profileService";

interface UseProfileCompletionReturn {
  completion: ProfileCompletion | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useProfileCompletion(): UseProfileCompletionReturn {
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCompletion = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await profileService.getProfileCompletion();
      setCompletion(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch completion"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompletion();
  }, [fetchCompletion]);

  return {
    completion,
    isLoading,
    error,
    refetch: fetchCompletion,
  };
}
