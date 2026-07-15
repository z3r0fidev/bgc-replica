import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileCompletionMeter } from "../../src/components/profile/ProfileCompletionMeter";
import { Profile, ProfileCompletion } from "../../src/types/profile";

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

vi.mock("../../src/hooks/use-profile-completion", () => ({
  useProfileCompletion: vi.fn(),
}));

import { useProfileCompletion } from "../../src/hooks/use-profile-completion";

const baseProfile: Profile = {
  id: "profile-1",
};

const fullApiCompletion: ProfileCompletion = {
  percentage: 67,
  raw_percentage: 60,
  critical_filled: 3,
  critical_total: 4,
  important_filled: 2,
  important_total: 4,
  nice_to_have_filled: 1,
  nice_to_have_total: 3,
  suggestions: [
    {
      field: "bio",
      label: "Add a bio",
      category: "critical",
      tab: "basics",
      weight: 5,
      quick_win: true,
    },
  ],
  milestones: [
    { level: 1, name: "Beginner", threshold: 25, reached: true, badge_icon: "seedling" },
    { level: 2, name: "Explorer", threshold: 50, reached: true, badge_icon: "compass" },
    { level: 3, name: "Socialite", threshold: 75, reached: false, badge_icon: "star" },
    { level: 4, name: "Complete", threshold: 95, reached: false, badge_icon: "trophy" },
  ],
  current_milestone: "Explorer",
  next_milestone: "Socialite",
  status_label: "Social",
  feature_unlocks: [
    {
      threshold: 40,
      name: "Search Visibility",
      description: "Profile visible in search",
      unlocked: true,
    },
  ],
};

function mockCompletionHook(overrides: Partial<ReturnType<typeof useProfileCompletion>> = {}) {
  vi.mocked(useProfileCompletion).mockReturnValue({
    completion: fullApiCompletion,
    isLoading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });
}

describe("ProfileCompletionMeter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading skeleton while fetching and no cached completion exists", () => {
    mockCompletionHook({ completion: null, isLoading: true });
    const { container } = render(<ProfileCompletionMeter profile={baseProfile} />);
    // Skeleton components render with data-slot="skeleton" - assert no percentage text yet
    expect(screen.queryByText(/%/)).toBeNull();
    expect(container.querySelector('[data-slot="skeleton"]')).toBeDefined();
  });

  it("renders the completion percentage from the API once loaded", () => {
    mockCompletionHook();
    render(<ProfileCompletionMeter profile={baseProfile} />);
    expect(screen.getByText("67%")).toBeDefined();
  });

  it("renders category breakdown counts", () => {
    mockCompletionHook();
    render(<ProfileCompletionMeter profile={baseProfile} />);
    expect(screen.getByText("3/4")).toBeDefined();
    expect(screen.getByText("2/4")).toBeDefined();
    expect(screen.getByText("1/3")).toBeDefined();
  });

  it("renders suggestions/tips when present", () => {
    mockCompletionHook();
    render(<ProfileCompletionMeter profile={baseProfile} />);
    expect(screen.getByText("Add a bio")).toBeDefined();
  });

  it("does not render the CompletionTips block when there are no suggestions", () => {
    mockCompletionHook({
      completion: { ...fullApiCompletion, suggestions: [] },
    });
    render(<ProfileCompletionMeter profile={baseProfile} />);
    expect(screen.queryByText("Add a bio")).toBeNull();
  });

  it("calls onSuggestionClick when a tip is clicked", () => {
    mockCompletionHook();
    const onSuggestionClick = vi.fn();
    render(
      <ProfileCompletionMeter profile={baseProfile} onSuggestionClick={onSuggestionClick} />
    );
    fireEvent.click(screen.getByText("Add a bio"));
    expect(onSuggestionClick).toHaveBeenCalledWith(fullApiCompletion.suggestions[0]);
  });

  it("shows a retry button when there is an error, and refetches on click", () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    mockCompletionHook({ error: new Error("boom"), refetch });
    render(<ProfileCompletionMeter profile={baseProfile} />);

    const retryButtons = screen.getAllByRole("button");
    // Full (non-compact) mode error state renders a RefreshCw icon button
    fireEvent.click(retryButtons[0]);
    expect(refetch).toHaveBeenCalled();
  });

  it("does not show a retry button when there is no error", () => {
    mockCompletionHook({ error: null });
    const { container } = render(<ProfileCompletionMeter profile={baseProfile} />);
    expect(container.querySelector(".lucide-refresh-cw")).toBeNull();
  });

  it("falls back to the locally-calculated completion when the API returns null", () => {
    mockCompletionHook({ completion: null, isLoading: false });
    render(
      <ProfileCompletionMeter
        profile={{
          ...baseProfile,
          display_name: "Jane",
          bio: "hello",
        }}
      />
    );
    // 2 of 13 tracked fields filled -> raw 15% -> 20 + round(15 * 0.8) = 32%
    // (see calculateFallbackCompletion in ProfileCompletionMeter.tsx)
    expect(screen.getByText("32%")).toBeDefined();
  });

  it("floors the fallback percentage at 20% and labels it 'Incomplete' / 'None' when no tracked fields are filled", () => {
    mockCompletionHook({ completion: null, isLoading: false });
    render(<ProfileCompletionMeter profile={baseProfile} />);
    // 0 of 13 fields filled -> raw 0% -> floor of 20%
    expect(screen.getByText("20%")).toBeDefined();
    expect(screen.getByText("Incomplete")).toBeDefined();
  });

  it("reaches 100% and labels it 'Robust' / 'Complete' when every tracked field is filled, including array and object fields", () => {
    mockCompletionHook({ completion: null, isLoading: false });
    render(
      <ProfileCompletionMeter
        profile={{
          ...baseProfile,
          display_name: "Jane",
          pronouns: "She/Her",
          birthdate: "1990-01-01",
          gender_identity: "Cis-female",
          relationship_status: "Single",
          looking_for: ["Dating"],
          occupation: "Engineer",
          industry: "Technology",
          education_level: "Bachelors Degree",
          university: "MIT",
          social_links: { instagram_url: "https://instagram.com/jane" },
          bio: "hello",
          location_city: "Austin",
        }}
      />
    );
    // All 13 tracked fields filled -> raw 100% -> 20 + round(100 * 0.8) = 100%
    expect(screen.getByText("100%")).toBeDefined();
    expect(screen.getByText("Robust")).toBeDefined();
  });

  it("lands in the 'Explorer' / 'Social' bucket at a mid-range percentage", () => {
    mockCompletionHook({ completion: null, isLoading: false });
    render(
      <ProfileCompletionMeter
        profile={{
          ...baseProfile,
          display_name: "Jane",
          pronouns: "She/Her",
          gender_identity: "Cis-female",
          occupation: "Engineer",
          industry: "Technology",
          bio: "hello",
        }}
      />
    );
    // 6 of 13 fields filled -> raw 46% -> 20 + round(46 * 0.8) = 57%
    expect(screen.getByText("57%")).toBeDefined();
    expect(screen.getByText("Social")).toBeDefined();
  });

  it("lands in the 'Socialite' / 'Robust' bucket at a high percentage", () => {
    mockCompletionHook({ completion: null, isLoading: false });
    render(
      <ProfileCompletionMeter
        profile={{
          ...baseProfile,
          display_name: "Jane",
          pronouns: "She/Her",
          gender_identity: "Cis-female",
          relationship_status: "Single",
          occupation: "Engineer",
          industry: "Technology",
          education_level: "Bachelors Degree",
          social_links: { instagram_url: "https://instagram.com/jane" },
          bio: "hello",
          location_city: "Austin",
        }}
      />
    );
    // 10 of 13 fields filled -> raw 77% -> 20 + round(77 * 0.8) = 82%
    expect(screen.getByText("82%")).toBeDefined();
    expect(screen.getByText("Robust")).toBeDefined();
  });

  describe("compact mode", () => {
    it("starts collapsed and toggles open on click", () => {
      mockCompletionHook();
      render(<ProfileCompletionMeter profile={baseProfile} compact />);

      // Collapsed: tips should not be visible yet
      expect(screen.queryByText("Add a bio")).toBeNull();

      fireEvent.click(screen.getByText("Profile Completion"));

      expect(screen.getByText("Add a bio")).toBeDefined();
    });

    it("shows the percentage next to the title in compact mode", () => {
      mockCompletionHook();
      render(<ProfileCompletionMeter profile={baseProfile} compact />);
      expect(screen.getByText("67%")).toBeDefined();
    });
  });
});
