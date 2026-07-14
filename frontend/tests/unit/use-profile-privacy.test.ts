import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { PrivacySettings } from "../../src/types/profile";

vi.mock("../../src/services/profileService", () => ({
  profileService: {
    updatePrivacySettings: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { profileService } from "../../src/services/profileService";
import { toast } from "sonner";
import { useProfilePrivacy } from "../../src/hooks/use-profile-privacy";

describe("useProfilePrivacy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("hasChanges is false right after init with no changes", () => {
    const { result } = renderHook(() =>
      useProfilePrivacy({ initialSettings: { bio: "PUBLIC" } })
    );

    expect(result.current.hasChanges).toBe(false);
    expect(result.current.privacySettings).toEqual({ bio: "PUBLIC" });
  });

  it("setFieldPrivacy updates privacySettings and marks pendingChanges (hasChanges becomes true)", () => {
    const { result } = renderHook(() =>
      useProfilePrivacy({ initialSettings: { bio: "PUBLIC" } })
    );

    act(() => {
      result.current.setFieldPrivacy("bio", "PRIVATE");
    });

    expect(result.current.privacySettings.bio).toBe("PRIVATE");
    expect(result.current.hasChanges).toBe(true);
  });

  it("with autoSave: false (default), setFieldPrivacy does not call the service", () => {
    const { result } = renderHook(() =>
      useProfilePrivacy({ initialSettings: {} })
    );

    act(() => {
      result.current.setFieldPrivacy("bio", "FRIENDS_ONLY");
    });

    expect(profileService.updatePrivacySettings).not.toHaveBeenCalled();
  });

  it("with autoSave: true, setFieldPrivacy fires the service immediately for just that field", async () => {
    vi.mocked(profileService.updatePrivacySettings).mockResolvedValue({
      status: "ok",
      privacy_settings: { bio: "PRIVATE" },
    });

    const { result } = renderHook(() =>
      useProfilePrivacy({ initialSettings: {}, autoSave: true })
    );

    await act(async () => {
      result.current.setFieldPrivacy("bio", "PRIVATE");
    });

    expect(profileService.updatePrivacySettings).toHaveBeenCalledWith({
      bio: "PRIVATE",
    });
  });

  it("autoSave rejection calls toast.error and does not throw out of the hook", async () => {
    vi.mocked(profileService.updatePrivacySettings).mockRejectedValue(
      new Error("network fail")
    );

    const { result } = renderHook(() =>
      useProfilePrivacy({ initialSettings: {}, autoSave: true })
    );

    await act(async () => {
      // Should not throw
      result.current.setFieldPrivacy("bio", "PRIVATE");
      // flush the fire-and-forget promise
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to save privacy setting");
  });

  it("savePrivacySettings no-ops when pendingChanges is empty", async () => {
    const { result } = renderHook(() =>
      useProfilePrivacy({ initialSettings: { bio: "PUBLIC" } })
    );

    await act(async () => {
      await result.current.savePrivacySettings();
    });

    expect(profileService.updatePrivacySettings).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("savePrivacySettings calls the service with pending changes and updates settings on success", async () => {
    const serverSettings: PrivacySettings = {
      bio: "PRIVATE",
      pronouns: "FRIENDS_ONLY",
    };
    vi.mocked(profileService.updatePrivacySettings).mockResolvedValue({
      status: "ok",
      privacy_settings: serverSettings,
    });

    const { result } = renderHook(() =>
      useProfilePrivacy({ initialSettings: { bio: "PUBLIC" } })
    );

    act(() => {
      result.current.setFieldPrivacy("bio", "PRIVATE");
    });
    act(() => {
      result.current.setFieldPrivacy("pronouns", "FRIENDS_ONLY");
    });

    await act(async () => {
      await result.current.savePrivacySettings();
    });

    expect(profileService.updatePrivacySettings).toHaveBeenCalledWith({
      bio: "PRIVATE",
      pronouns: "FRIENDS_ONLY",
    });
    expect(result.current.privacySettings).toEqual(serverSettings);
    expect(result.current.hasChanges).toBe(false);
    expect(toast.success).toHaveBeenCalledWith("Privacy settings saved");
    expect(result.current.isSaving).toBe(false);
  });

  it("savePrivacySettings calls toast.error and rethrows on failure, and resets isSaving", async () => {
    const err = new Error("save failed");
    vi.mocked(profileService.updatePrivacySettings).mockRejectedValue(err);

    const { result } = renderHook(() =>
      useProfilePrivacy({ initialSettings: {} })
    );

    act(() => {
      result.current.setFieldPrivacy("bio", "PRIVATE");
    });

    await act(async () => {
      await expect(result.current.savePrivacySettings()).rejects.toThrow(
        "save failed"
      );
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to save privacy settings");
    expect(result.current.isSaving).toBe(false);
  });

  it("resetChanges reverts privacySettings to originalSettings and clears pendingChanges", () => {
    const { result } = renderHook(() =>
      useProfilePrivacy({ initialSettings: { bio: "PUBLIC" } })
    );

    act(() => {
      result.current.setFieldPrivacy("bio", "PRIVATE");
    });
    expect(result.current.hasChanges).toBe(true);

    act(() => {
      result.current.resetChanges();
    });

    expect(result.current.privacySettings).toEqual({ bio: "PUBLIC" });
    expect(result.current.hasChanges).toBe(false);
  });
});
