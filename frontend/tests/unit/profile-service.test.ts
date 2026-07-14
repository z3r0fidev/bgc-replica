import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { profileService } from "@/services/profileService";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("profileService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getMyProfile", () => {
    it("fetches the current user's profile", async () => {
      const body = { id: "me" };
      const fetchMock = mockFetchOnce(body);

      const result = await profileService.getMyProfile();

      expect(fetchMock).toHaveBeenCalledWith("/api/profiles/me", {
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(body);
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 401);

      await expect(profileService.getMyProfile()).rejects.toThrow(
        "Failed to fetch profile"
      );
    });
  });

  describe("updateProfile", () => {
    it("sends a PATCH with the update body", async () => {
      const body = { id: "me", bio: "updated" };
      const fetchMock = mockFetchOnce(body);
      const update = { bio: "updated" };

      const result = await profileService.updateProfile(update);

      expect(fetchMock).toHaveBeenCalledWith("/api/profiles/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      expect(result).toEqual(body);
    });

    it("throws the server-provided detail message when not ok", async () => {
      mockFetchOnce({ detail: "custom error" }, false, 400);

      await expect(profileService.updateProfile({ bio: "x" })).rejects.toThrow(
        "custom error"
      );
    });
  });

  describe("updatePrivacySettings", () => {
    it("sends a PUT with the settings body", async () => {
      const body = { status: "ok", privacy_settings: { bio: "PUBLIC" as const } };
      const fetchMock = mockFetchOnce(body);
      const settings = { bio: "PUBLIC" as const };

      const result = await profileService.updatePrivacySettings(settings);

      expect(fetchMock).toHaveBeenCalledWith("/api/profiles/me/privacy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      expect(result).toEqual(body);
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 500);

      await expect(
        profileService.updatePrivacySettings({ bio: "PUBLIC" })
      ).rejects.toThrow("Failed to update privacy settings");
    });
  });

  describe("getPublicProfile", () => {
    it("fetches a specific user's profile with an auth header when logged in", async () => {
      localStorage.setItem("access_token", "jwt-abc");
      const body = { id: "user-1" };
      const fetchMock = mockFetchOnce(body);

      const result = await profileService.getPublicProfile("user-1");

      expect(fetchMock).toHaveBeenCalledWith("/api/profiles/user-1", {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer jwt-abc",
        },
      });
      expect(result).toEqual(body);
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 404);

      await expect(profileService.getPublicProfile("user-1")).rejects.toThrow(
        "Failed to fetch profile"
      );
    });
  });

  describe("getProfileCompletion", () => {
    it("fetches the completion endpoint", async () => {
      const body = { percentage: 80 };
      const fetchMock = mockFetchOnce(body);

      const result = await profileService.getProfileCompletion();

      expect(fetchMock).toHaveBeenCalledWith("/api/profiles/me/completion", {
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(body);
    });

    it("throws when the response is not ok", async () => {
      mockFetchOnce({}, false, 401);

      await expect(profileService.getProfileCompletion()).rejects.toThrow(
        "Failed to fetch profile completion"
      );
    });
  });
});
