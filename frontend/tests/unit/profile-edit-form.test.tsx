import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfileEditForm } from "../../src/components/profile/edit/ProfileEditForm";
import { Profile } from "../../src/types/profile";

// jsdom doesn't implement pointer capture / scrollIntoView, needed by Radix Select
// (used inside the tabs) and Radix Tabs relies on mousedown for activation.
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false);
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || (() => {});
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || (() => {});
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

vi.mock("../../src/services/profileService", () => ({
  profileService: {
    getMyProfile: vi.fn(),
    updateProfile: vi.fn(),
    updatePrivacySettings: vi.fn(),
    getProfileCompletion: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

import { profileService } from "../../src/services/profileService";
import { toast } from "sonner";

const baseProfile: Profile = {
  id: "profile-1",
  display_name: "Jane Doe",
  pronouns: "She/Her",
  birthdate: "1995-06-15T00:00:00.000Z",
  gender_identity: "Cis-female",
  relationship_status: "Single",
  looking_for: ["Dating"],
  occupation: "Engineer",
  industry: "Technology",
  education_level: "Bachelors Degree",
  university: "MIT",
  social_links: {
    instagram_url: "https://instagram.com/jane",
    x_url: "",
    tiktok_url: "",
    website_url: "",
  },
  privacy_settings: {},
};

function mockCompletionFetchFailure() {
  // ProfileCompletionMeter's useProfileCompletion hook calls profileService.getProfileCompletion
  vi.mocked(profileService.getProfileCompletion).mockRejectedValue(
    new Error("no completion")
  );
}

describe("ProfileEditForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompletionFetchFailure();
  });

  it("shows a loading spinner while fetching the profile", async () => {
    let resolveProfile!: (p: Profile) => void;
    vi.mocked(profileService.getMyProfile).mockReturnValue(
      new Promise((resolve) => {
        resolveProfile = resolve;
      })
    );

    const { container } = render(<ProfileEditForm />);

    expect(container.querySelector(".animate-spin")).toBeDefined();
    expect(screen.queryByText("Edit Profile")).toBeNull();

    resolveProfile(baseProfile);

    await waitFor(() => {
      expect(screen.getByText("Edit Profile")).toBeDefined();
    });
  });

  it("renders the form with fetched data, formatting the birthdate as YYYY-MM-DD", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue(baseProfile);

    render(<ProfileEditForm />);

    await waitFor(() => {
      expect(screen.getByText("Edit Profile")).toBeDefined();
    });

    const displayNameInput = screen.getByPlaceholderText(
      /how you want to be known/i
    ) as HTMLInputElement;
    expect(displayNameInput.value).toBe("Jane Doe");

    const birthdateInput = document.querySelector(
      'input[type="date"]'
    ) as HTMLInputElement;
    expect(birthdateInput.value).toBe("1995-06-15");
  });

  it("shows a toast error and stops the loading spinner when the profile fetch fails", async () => {
    vi.mocked(profileService.getMyProfile).mockRejectedValue(new Error("network down"));

    const { container } = render(<ProfileEditForm />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load profile");
    });

    expect(container.querySelector(".animate-spin")).toBeNull();
  });

  it("switches tab content when a different tab is clicked", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue(baseProfile);
    render(<ProfileEditForm />);

    await waitFor(() => expect(screen.getByText("Edit Profile")).toBeDefined());

    // Identity tab content is visible by default
    expect(screen.getByPlaceholderText(/how you want to be known/i)).toBeDefined();

    const lifestyleTrigger = screen.getByRole("tab", { name: /lifestyle/i });
    fireEvent.mouseDown(lifestyleTrigger, { button: 0 });

    await waitFor(() => {
      expect(screen.getAllByText(/looking for/i).length).toBeGreaterThan(0);
    });
    // Identity-only field should no longer be in the document
    expect(screen.queryByPlaceholderText(/how you want to be known/i)).toBeNull();
  });

  it("cleans up empty-string social links before calling updateProfile", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue({
      ...baseProfile,
      social_links: {
        instagram_url: "https://instagram.com/jane",
        x_url: "",
        tiktok_url: "",
        website_url: "",
      },
    });
    vi.mocked(profileService.updateProfile).mockResolvedValue(baseProfile);

    render(<ProfileEditForm />);
    await waitFor(() => expect(screen.getByText("Edit Profile")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(profileService.updateProfile).toHaveBeenCalled();
    });

    const payload = vi.mocked(profileService.updateProfile).mock.calls[0][0];
    expect(payload.social_links).toEqual({
      instagram_url: "https://instagram.com/jane",
    });
  });

  it("omits social_links entirely from the payload when all links are empty", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue({
      ...baseProfile,
      social_links: {
        instagram_url: "",
        x_url: "",
        tiktok_url: "",
        website_url: "",
      },
    });
    vi.mocked(profileService.updateProfile).mockResolvedValue(baseProfile);

    render(<ProfileEditForm />);
    await waitFor(() => expect(screen.getByText("Edit Profile")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(profileService.updateProfile).toHaveBeenCalled();
    });

    const payload = vi.mocked(profileService.updateProfile).mock.calls[0][0];
    expect(payload.social_links).toBeUndefined();
  });

  it("does not call updatePrivacySettings when no privacy settings were changed", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue({
      ...baseProfile,
      privacy_settings: {},
    });
    vi.mocked(profileService.updateProfile).mockResolvedValue(baseProfile);

    render(<ProfileEditForm />);
    await waitFor(() => expect(screen.getByText("Edit Profile")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(profileService.updateProfile).toHaveBeenCalled();
    });

    expect(profileService.updatePrivacySettings).not.toHaveBeenCalled();
  });

  it("calls updatePrivacySettings with the accumulated settings when privacy was changed", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue({
      ...baseProfile,
      privacy_settings: { pronouns: "PRIVATE" },
    });
    vi.mocked(profileService.updateProfile).mockResolvedValue(baseProfile);
    vi.mocked(profileService.updatePrivacySettings).mockResolvedValue({
      status: "ok",
      privacy_settings: { pronouns: "PRIVATE" },
    });

    render(<ProfileEditForm />);
    await waitFor(() => expect(screen.getByText("Edit Profile")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(profileService.updatePrivacySettings).toHaveBeenCalledWith({
        pronouns: "PRIVATE",
      });
    });
  });

  it("shows a success toast after a successful save", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue(baseProfile);
    vi.mocked(profileService.updateProfile).mockResolvedValue(baseProfile);

    render(<ProfileEditForm />);
    await waitFor(() => expect(screen.getByText("Edit Profile")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Profile updated successfully!");
    });
  });

  it("shows an error toast with the thrown message when saving fails", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue(baseProfile);
    vi.mocked(profileService.updateProfile).mockRejectedValue(
      new Error("Display name already taken")
    );

    render(<ProfileEditForm />);
    await waitFor(() => expect(screen.getByText("Edit Profile")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Display name already taken");
    });
  });

  it("shows a generic error toast when a non-Error is thrown while saving", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue(baseProfile);
    vi.mocked(profileService.updateProfile).mockRejectedValue("raw string failure");

    render(<ProfileEditForm />);
    await waitFor(() => expect(screen.getByText("Edit Profile")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update profile");
    });
  });

  it("shows a 'Saving...' spinner state on the submit button while the update is in flight", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue(baseProfile);
    let resolveUpdate!: (p: Profile) => void;
    vi.mocked(profileService.updateProfile).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      })
    );

    render(<ProfileEditForm />);
    await waitFor(() => expect(screen.getByText("Edit Profile")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText("Saving...")).toBeDefined();

    resolveUpdate(baseProfile);

    await waitFor(() => {
      expect(screen.queryByText("Saving...")).toBeNull();
    });
  });

  it("falls back to empty strings/arrays and skips birthdate formatting when fetched fields are missing", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue({ id: "profile-minimal" });

    render(<ProfileEditForm />);
    await waitFor(() => expect(screen.getByText("Edit Profile")).toBeDefined());

    const displayNameInput = screen.getByPlaceholderText(
      /how you want to be known/i
    ) as HTMLInputElement;
    expect(displayNameInput.value).toBe("");

    const birthdateInput = document.querySelector(
      'input[type="date"]'
    ) as HTMLInputElement;
    expect(birthdateInput.value).toBe("");
  });

  it("leaves the birthdate input blank when the fetched birthdate string is unparseable", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue({
      ...baseProfile,
      birthdate: "not-a-real-date",
    });

    render(<ProfileEditForm />);
    await waitFor(() => expect(screen.getByText("Edit Profile")).toBeDefined());

    const birthdateInput = document.querySelector(
      'input[type="date"]'
    ) as HTMLInputElement;
    expect(birthdateInput.value).toBe("");
  });

  it("converts blank optional fields to undefined in the update payload", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue({ id: "profile-minimal" });
    vi.mocked(profileService.updateProfile).mockResolvedValue(baseProfile);

    render(<ProfileEditForm />);
    await waitFor(() => expect(screen.getByText("Edit Profile")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(profileService.updateProfile).toHaveBeenCalled();
    });

    const payload = vi.mocked(profileService.updateProfile).mock.calls[0][0];
    expect(payload.display_name).toBeUndefined();
    expect(payload.pronouns).toBeUndefined();
    expect(payload.birthdate).toBeUndefined();
    expect(payload.gender_identity).toBeUndefined();
    expect(payload.relationship_status).toBeUndefined();
    expect(payload.occupation).toBeUndefined();
    expect(payload.industry).toBeUndefined();
    expect(payload.education_level).toBeUndefined();
    expect(payload.university).toBeUndefined();
    expect(payload.social_links).toBeUndefined();
  });

  it("updates privacySettings state when a privacy toggle inside a tab is changed", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue({
      ...baseProfile,
      privacy_settings: {},
    });
    vi.mocked(profileService.updateProfile).mockResolvedValue(baseProfile);
    vi.mocked(profileService.updatePrivacySettings).mockResolvedValue({
      status: "ok",
      privacy_settings: { pronouns: "PRIVATE" },
    });

    render(<ProfileEditForm />);
    await waitFor(() => expect(screen.getByText("Edit Profile")).toBeDefined());

    const pronounsToggle = screen.getByTestId("privacy-toggle-pronouns");
    fireEvent.pointerDown(pronounsToggle, {
      button: 0,
      pointerType: "mouse",
      ctrlKey: false,
    });
    fireEvent.click(pronounsToggle);

    const privateOption = await screen.findByRole("option", { name: /^private$/i });
    fireEvent.pointerUp(privateOption);
    fireEvent.click(privateOption);

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(profileService.updatePrivacySettings).toHaveBeenCalledWith({
        pronouns: "PRIVATE",
      });
    });
  });
});
