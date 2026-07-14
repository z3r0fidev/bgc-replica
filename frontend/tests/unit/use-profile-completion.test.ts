import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ProfileCompletion } from "../../src/types/profile";

vi.mock("../../src/services/profileService", () => ({
  profileService: {
    getProfileCompletion: vi.fn(),
  },
}));

import { profileService } from "../../src/services/profileService";
import { useProfileCompletion } from "../../src/hooks/use-profile-completion";

const mockCompletion: ProfileCompletion = {
  percentage: 80,
  raw_percentage: 80,
  critical_filled: 4,
  critical_total: 5,
  important_filled: 3,
  important_total: 3,
  nice_to_have_filled: 1,
  nice_to_have_total: 2,
  suggestions: [],
  milestones: [],
  current_milestone: "compass",
  status_label: "Getting there",
  feature_unlocks: [],
};

describe("useProfileCompletion", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("fetches completion on mount, toggling isLoading and populating completion", async () => {
    vi.mocked(profileService.getProfileCompletion).mockResolvedValue(
      mockCompletion
    );

    const { result } = renderHook(() => useProfileCompletion());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.completion).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.completion).toEqual(mockCompletion);
    expect(result.current.error).toBeNull();
    expect(profileService.getProfileCompletion).toHaveBeenCalledTimes(1);
  });

  it("sets error to the thrown Error instance on rejection", async () => {
    const err = new Error("boom");
    vi.mocked(profileService.getProfileCompletion).mockRejectedValue(err);

    const { result } = renderHook(() => useProfileCompletion());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(err);
    expect(result.current.completion).toBeNull();
  });

  it("wraps a non-Error rejection value into an Error", async () => {
    vi.mocked(profileService.getProfileCompletion).mockRejectedValue(
      "some string failure"
    );

    const { result } = renderHook(() => useProfileCompletion());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Failed to fetch completion");
  });

  it("refetch re-runs the fetch and is the same function used on mount", async () => {
    vi.mocked(profileService.getProfileCompletion).mockResolvedValue(
      mockCompletion
    );

    const { result } = renderHook(() => useProfileCompletion());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const refetchFromMount = result.current.refetch;
    expect(profileService.getProfileCompletion).toHaveBeenCalledTimes(1);

    const updated: ProfileCompletion = { ...mockCompletion, percentage: 95 };
    vi.mocked(profileService.getProfileCompletion).mockResolvedValue(updated);

    await act(async () => {
      await result.current.refetch();
    });

    expect(profileService.getProfileCompletion).toHaveBeenCalledTimes(2);
    expect(result.current.completion).toEqual(updated);
    // Referentially stable across the render triggered by the refetch itself.
    expect(result.current.refetch).toBe(refetchFromMount);
  });

  it("clears a previous error when refetch succeeds", async () => {
    vi.mocked(profileService.getProfileCompletion).mockRejectedValueOnce(
      new Error("first failure")
    );

    const { result } = renderHook(() => useProfileCompletion());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    vi.mocked(profileService.getProfileCompletion).mockResolvedValueOnce(
      mockCompletion
    );

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.completion).toEqual(mockCompletion);
  });
});
