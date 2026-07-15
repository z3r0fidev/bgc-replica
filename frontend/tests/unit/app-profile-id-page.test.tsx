import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ProfilePage from "../../src/app/(protected)/profile/[id]/page";
import { profileService } from "../../src/services/profileService";
import type { Profile } from "../../src/types/profile";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("../../src/services/profileService", () => ({
  profileService: {
    getPublicProfile: vi.fn(),
  },
}));

vi.mock("../../src/components/profile/view/ProfileView", () => ({
  ProfileView: ({ profile, isOwner }: { profile: Profile; isOwner: boolean }) => (
    <div data-testid="profile-view">
      <span data-testid="profile-id">{profile.id}</span>
      <span data-testid="is-owner">{String(isOwner)}</span>
    </div>
  ),
}));

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return { id: "profile-1", bio: "hello", ...overrides };
}

describe("ProfilePage ([id])", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ id: "user-1" });
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
    } as ReturnType<typeof useSession>);
  });

  it("shows a loading spinner while fetching", () => {
    vi.mocked(profileService.getPublicProfile).mockReturnValue(new Promise(() => {}));
    const { container } = render(<ProfilePage />);
    expect(container.querySelector("svg.animate-spin")).not.toBeNull();
  });

  it("renders ProfileView with isOwner=false when the viewer differs from the profile", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "someone-else" } },
      status: "authenticated",
    } as ReturnType<typeof useSession>);
    vi.mocked(profileService.getPublicProfile).mockResolvedValue(
      makeProfile({ id: "user-1" })
    );
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-view")).toBeDefined();
    });
    expect(profileService.getPublicProfile).toHaveBeenCalledWith("user-1");
    expect(screen.getByTestId("is-owner").textContent).toBe("false");
  });

  it("renders ProfileView with isOwner=true when the session user matches the route id", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-1" } },
      status: "authenticated",
    } as ReturnType<typeof useSession>);
    vi.mocked(profileService.getPublicProfile).mockResolvedValue(
      makeProfile({ id: "user-1" })
    );
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByTestId("is-owner").textContent).toBe("true");
    });
  });

  it("shows an error message when the fetch throws", async () => {
    vi.mocked(profileService.getPublicProfile).mockRejectedValue(
      new Error("network fail")
    );
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load profile")).toBeDefined();
    });
  });

  it("shows a not-found message when the profile resolves falsy", async () => {
    vi.mocked(profileService.getPublicProfile).mockResolvedValue(
      null as unknown as Profile
    );
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Profile not found")).toBeDefined();
    });
  });

  it("does not fetch when userId is falsy", () => {
    vi.mocked(useParams).mockReturnValue({ id: undefined });
    render(<ProfilePage />);
    expect(profileService.getPublicProfile).not.toHaveBeenCalled();
  });
});
