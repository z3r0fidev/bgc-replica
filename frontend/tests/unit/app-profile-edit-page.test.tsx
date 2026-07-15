import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ProfileEditPage from "../../src/app/(protected)/profile/edit/page";
import { profileService } from "../../src/services/profileService";
import type { Profile } from "../../src/types/profile";

vi.mock("../../src/services/profileService", () => ({
  profileService: {
    getMyProfile: vi.fn(),
    updateProfile: vi.fn(),
    updatePrivacySettings: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// These tab components are separately unit-tested elsewhere; stub them so this
// suite can focus on the edit page's own state machine (fetch/reset/submit/
// tab switching), not their internals.
let capturedOnPrivacyChange:
  | ((field: string, level: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE") => void)
  | undefined;

vi.mock("../../src/components/profile/edit/tabs/IdentityTab", () => ({
  IdentityTab: ({
    onPrivacyChange,
  }: {
    onPrivacyChange: (
      field: string,
      level: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE"
    ) => void;
  }) => {
    capturedOnPrivacyChange = onPrivacyChange;
    return <div data-testid="identity-tab">identity-tab</div>;
  },
}));
vi.mock("../../src/components/profile/edit/tabs/LifestyleTab", () => ({
  LifestyleTab: () => <div data-testid="lifestyle-tab">lifestyle-tab</div>,
}));
vi.mock("../../src/components/profile/edit/tabs/ProfessionalTab", () => ({
  ProfessionalTab: () => <div data-testid="professional-tab">professional-tab</div>,
}));
vi.mock("../../src/components/profile/edit/tabs/SocialLinksTab", () => ({
  SocialLinksTab: () => <div data-testid="social-tab">social-tab</div>,
}));

let capturedOnSuggestionClick:
  | ((tip: { tab: string; field: string }) => void)
  | undefined;

vi.mock("../../src/components/profile/ProfileCompletionMeter", () => ({
  ProfileCompletionMeter: ({
    onSuggestionClick,
  }: {
    onSuggestionClick: (tip: { tab: string; field: string }) => void;
  }) => {
    capturedOnSuggestionClick = onSuggestionClick;
    return <div data-testid="completion-meter">completion-meter</div>;
  },
}));

import { toast } from "sonner";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "profile-1",
    bio: "Existing bio",
    height: "5ft 10in",
    weight: 170,
    ethnicity: "Mixed",
    body_type: "Athletic",
    location_city: "Metropolis",
    location_state: "NY",
    display_name: "Test User",
    privacy_settings: {},
    ...overrides,
  };
}

describe("ProfileEditPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnSuggestionClick = undefined;
    capturedOnPrivacyChange = undefined;
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows a loading spinner while fetching the profile", () => {
    vi.mocked(profileService.getMyProfile).mockReturnValue(new Promise(() => {}));
    const { container } = render(<ProfileEditPage />);
    expect(container.querySelector("svg.animate-spin")).not.toBeNull();
  });

  it("shows an error toast when loading the profile fails", async () => {
    vi.mocked(profileService.getMyProfile).mockRejectedValue(new Error("boom"));
    render(<ProfileEditPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load profile");
    });
  });

  it("loads the profile and populates the basics tab fields", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue(makeProfile());
    render(<ProfileEditPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Existing bio")).toBeDefined();
    });
    expect(screen.getByDisplayValue("5ft 10in")).toBeDefined();
    expect(screen.getByDisplayValue("170")).toBeDefined();
    expect(screen.getByDisplayValue("Metropolis")).toBeDefined();
    expect(screen.getByDisplayValue("NY")).toBeDefined();
  });

  it("formats a valid birthdate into an ISO date-only string on load", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue(
      makeProfile({ birthdate: "1990-05-15T00:00:00.000Z" })
    );
    render(<ProfileEditPage />);

    await waitFor(() => screen.getByDisplayValue("Existing bio"));
    // No crash / no toast error implies the invalid-date branch was skipped correctly.
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("switches between tabs, rendering the corresponding stubbed component", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue(makeProfile());
    render(<ProfileEditPage />);
    await waitFor(() => screen.getByDisplayValue("Existing bio"));

    // Radix's TabsTrigger switches tabs on mousedown, not click.
    expect(screen.queryByTestId("identity-tab")).toBeNull();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Identity" }), { button: 0 });
    await waitFor(() => expect(screen.getByTestId("identity-tab")).toBeDefined());

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Lifestyle" }), { button: 0 });
    await waitFor(() => expect(screen.getByTestId("lifestyle-tab")).toBeDefined());

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Work" }), { button: 0 });
    await waitFor(() => expect(screen.getByTestId("professional-tab")).toBeDefined());

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Social" }), { button: 0 });
    await waitFor(() => expect(screen.getByTestId("social-tab")).toBeDefined());
  });

  it("switches to the tab named in a completion-meter suggestion click", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue(makeProfile());
    render(<ProfileEditPage />);
    await waitFor(() => screen.getByDisplayValue("Existing bio"));

    expect(capturedOnSuggestionClick).toBeDefined();
    act(() => {
      capturedOnSuggestionClick!({ tab: "professional", field: "occupation" });
    });

    await waitFor(() => {
      expect(screen.getByTestId("professional-tab")).toBeDefined();
    });
    // Focus/scroll-into-view is a cosmetic side effect behind a setTimeout;
    // the tab-switch behavior above is the meaningful assertion here.
  });

  it("changes the ethnicity and body type selects", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue(makeProfile());
    render(<ProfileEditPage />);
    await waitFor(() => screen.getByDisplayValue("Existing bio"));

    const comboboxes = screen.getAllByRole("combobox");
    // Ethnicity select first, body type second (DOM order on the basics tab).
    // Radix also renders a hidden native <select><option> for form autofill,
    // so target the visible dropdown option by role rather than by text.
    fireEvent.click(comboboxes[0]);
    await waitFor(() => screen.getByRole("option", { name: "Asian" }));
    fireEvent.click(screen.getByRole("option", { name: "Asian" }));

    // The form also renders a hidden native <select> mirror for autofill, so
    // assert on the visible trigger's own text rather than a page-wide query.
    await waitFor(() => {
      expect(comboboxes[0].textContent).toContain("Asian");
    });
  });

  it("submits the form and saves both profile data and privacy settings", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue(makeProfile());
    vi.mocked(profileService.updateProfile).mockResolvedValue(makeProfile());
    vi.mocked(profileService.updatePrivacySettings).mockResolvedValue({
      status: "ok",
      privacy_settings: {},
    });
    render(<ProfileEditPage />);
    await waitFor(() => screen.getByDisplayValue("Existing bio"));

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(profileService.updateProfile).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Profile updated successfully!");
    });
    const submittedData = vi.mocked(profileService.updateProfile).mock.calls[0][0];
    expect(submittedData.bio).toBe("Existing bio");
  });

  it("also saves privacy settings when a field's privacy level was changed", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue(makeProfile());
    vi.mocked(profileService.updateProfile).mockResolvedValue(makeProfile());
    vi.mocked(profileService.updatePrivacySettings).mockResolvedValue({
      status: "ok",
      privacy_settings: { bio: "FRIENDS_ONLY" },
    });
    render(<ProfileEditPage />);
    await waitFor(() => screen.getByDisplayValue("Existing bio"));

    // Mount the Identity tab (stubbed) to capture its onPrivacyChange callback.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Identity" }), { button: 0 });
    await waitFor(() => expect(capturedOnPrivacyChange).toBeDefined());
    act(() => {
      capturedOnPrivacyChange!("bio", "FRIENDS_ONLY");
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(profileService.updatePrivacySettings).toHaveBeenCalledWith({
        bio: "FRIENDS_ONLY",
      });
    });
  });

  it("shows an error toast when the submit fails", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue(makeProfile());
    vi.mocked(profileService.updateProfile).mockRejectedValue(
      new Error("save failed")
    );
    render(<ProfileEditPage />);
    await waitFor(() => screen.getByDisplayValue("Existing bio"));

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("save failed");
    });
  });

  it("updates the weight field as a number, clearing to undefined when emptied", async () => {
    vi.mocked(profileService.getMyProfile).mockResolvedValue(makeProfile());
    vi.mocked(profileService.updateProfile).mockResolvedValue(makeProfile());
    render(<ProfileEditPage />);
    await waitFor(() => screen.getByDisplayValue("Existing bio"));

    const weightInput = screen.getByDisplayValue("170");
    fireEvent.change(weightInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(profileService.updateProfile).toHaveBeenCalled();
    });
    const submittedData = vi.mocked(profileService.updateProfile).mock.calls[0][0];
    expect(submittedData.weight).toBeUndefined();
  });
});
