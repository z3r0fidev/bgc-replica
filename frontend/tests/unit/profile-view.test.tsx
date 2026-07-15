import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileView } from "../../src/components/profile/view/ProfileView";
import { Profile } from "../../src/types/profile";

vi.mock("../../src/hooks/use-block", () => ({
  useBlock: vi.fn(),
}));

import { useBlock } from "../../src/hooks/use-block";

const minimalProfile: Profile = {
  id: "profile-1",
};

const fullProfile: Profile = {
  id: "profile-2",
  display_name: "Jane Doe",
  pronouns: "She/Her",
  age: 29,
  gender_identity: "Cis-female",
  location_city: "Austin",
  location_state: "TX",
  bio: "Hello world",
  relationship_status: "Single",
  looking_for: ["Dating", "Friendship"],
  occupation: "Engineer",
  industry: "Technology",
  education_level: "Bachelors Degree",
  university: "MIT",
  social_links: {
    instagram_url: "https://instagram.com/jane",
    x_url: "https://x.com/jane",
    tiktok_url: "https://tiktok.com/@jane",
    website_url: "https://jane.dev",
  },
  height: "5'8\"",
  weight: 140,
  ethnicity: "Mixed",
  body_type: "Athletic",
  user: { id: "user-2", name: "Jane Doe Full", image: "https://example.com/jane.png" },
};

describe("ProfileView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBlock).mockReturnValue({
      isBlocked: false,
      blockedByMe: false,
      blockedByThem: false,
      isPending: false,
      isLoading: false,
      error: null,
      blockUser: vi.fn(),
      unblockUser: vi.fn(),
      toggleBlock: vi.fn(),
    });
  });

  it("falls back to 'User' when no display name or account name is set", () => {
    render(<ProfileView profile={minimalProfile} />);
    expect(screen.getByText("User")).toBeDefined();
  });

  it("falls back to the account name when display_name is missing", () => {
    render(
      <ProfileView
        profile={{ ...minimalProfile, user: { id: "u1", name: "Account Name" } }}
      />
    );
    expect(screen.getByText("Account Name")).toBeDefined();
  });

  it("prefers display_name over the account name", () => {
    render(<ProfileView profile={fullProfile} />);
    expect(screen.getByText("Jane Doe")).toBeDefined();
    expect(screen.queryByText("Jane Doe Full")).toBeNull();
  });

  it("computes initials from the display name for the avatar fallback", () => {
    render(<ProfileView profile={fullProfile} />);
    expect(screen.getByText("JD")).toBeDefined();
  });

  it("does not render optional sections that have no data", () => {
    render(<ProfileView profile={minimalProfile} />);
    expect(screen.queryByText("About")).toBeNull();
    expect(screen.queryByText("Lifestyle")).toBeNull();
    expect(screen.queryByText("Professional")).toBeNull();
    expect(screen.queryByText("Social Links")).toBeNull();
    expect(screen.queryByText("Physical Attributes")).toBeNull();
    expect(screen.queryByText(/years old/)).toBeNull();
  });

  it("renders pronouns, age, and gender badge when present", () => {
    render(<ProfileView profile={fullProfile} />);
    expect(screen.getByText("(She/Her)")).toBeDefined();
    expect(screen.getByText("29 years old")).toBeDefined();
    expect(screen.getByText("Cis-female")).toBeDefined();
  });

  it("joins city and state in the location line", () => {
    render(<ProfileView profile={fullProfile} />);
    expect(screen.getByText("Austin, TX")).toBeDefined();
  });

  it("renders only the city when state is missing", () => {
    render(
      <ProfileView profile={{ ...fullProfile, location_state: undefined }} />
    );
    expect(screen.getByText("Austin")).toBeDefined();
  });

  it("renders the bio section when bio is present", () => {
    render(<ProfileView profile={fullProfile} />);
    expect(screen.getByText("About")).toBeDefined();
    expect(screen.getByText("Hello world")).toBeDefined();
  });

  it("renders the lifestyle section with relationship status and looking-for badges", () => {
    render(<ProfileView profile={fullProfile} />);
    expect(screen.getByText("Lifestyle")).toBeDefined();
    expect(screen.getByText("Single")).toBeDefined();
    expect(screen.getByText("Dating")).toBeDefined();
    expect(screen.getByText("Friendship")).toBeDefined();
  });

  it("renders the lifestyle section when only looking_for is set (no relationship_status)", () => {
    render(
      <ProfileView
        profile={{
          ...minimalProfile,
          looking_for: ["Networking"],
        }}
      />
    );
    expect(screen.getByText("Lifestyle")).toBeDefined();
    expect(screen.queryByText("Relationship Status")).toBeNull();
  });

  it("renders the professional section with occupation, industry, and education", () => {
    render(<ProfileView profile={fullProfile} />);
    expect(screen.getByText("Professional")).toBeDefined();
    expect(screen.getByText("Engineer")).toBeDefined();
    expect(screen.getByText("Technology")).toBeDefined();
    expect(screen.getByText("Bachelors Degree")).toBeDefined();
    expect(screen.getByText("MIT")).toBeDefined();
  });

  it("renders the education/university block when only university is set (no education_level)", () => {
    render(
      <ProfileView
        profile={{
          ...minimalProfile,
          occupation: "Engineer",
          university: "MIT",
        }}
      />
    );
    expect(screen.getByText("Professional")).toBeDefined();
    expect(screen.getByText("MIT")).toBeDefined();
  });

  it("renders social links as external links with the correct hrefs", () => {
    render(<ProfileView profile={fullProfile} />);
    expect(screen.getByText("Social Links")).toBeDefined();

    const instagramLink = screen.getByRole("link", { name: /instagram/i });
    expect(instagramLink.getAttribute("href")).toBe("https://instagram.com/jane");
    expect(instagramLink.getAttribute("target")).toBe("_blank");
    expect(instagramLink.getAttribute("rel")).toBe("noopener noreferrer");

    expect(screen.getByRole("link", { name: /^x$/i }).getAttribute("href")).toBe(
      "https://x.com/jane"
    );
    expect(screen.getByRole("link", { name: /tiktok/i }).getAttribute("href")).toBe(
      "https://tiktok.com/@jane"
    );
    expect(screen.getByRole("link", { name: /website/i }).getAttribute("href")).toBe(
      "https://jane.dev"
    );
  });

  it("does not render the social links section when all links are empty", () => {
    render(
      <ProfileView
        profile={{
          ...fullProfile,
          social_links: {
            instagram_url: "",
            x_url: "",
            tiktok_url: "",
            website_url: "",
          },
        }}
      />
    );
    expect(screen.queryByText("Social Links")).toBeNull();
  });

  it("renders the physical attributes section including weight with a 'lbs' suffix", () => {
    render(<ProfileView profile={fullProfile} />);
    expect(screen.getByText("Physical Attributes")).toBeDefined();
    expect(screen.getByText("5'8\"")).toBeDefined();
    expect(screen.getByText("140 lbs")).toBeDefined();
    expect(screen.getByText("Mixed")).toBeDefined();
    expect(screen.getByText("Athletic")).toBeDefined();
  });

  it("shows an 'Edit Profile' link instead of ProfileActions when isOwner is true", () => {
    render(<ProfileView profile={fullProfile} isOwner />);
    const editLink = screen.getByRole("link", { name: /edit profile/i });
    expect(editLink.getAttribute("href")).toBe("/profile/edit");
    expect(screen.queryByRole("button", { name: /more actions/i })).toBeNull();
  });

  it("shows ProfileActions instead of the Edit Profile link when isOwner is false", () => {
    render(<ProfileView profile={fullProfile} isOwner={false} />);
    expect(screen.queryByRole("link", { name: /edit profile/i })).toBeNull();
    expect(screen.getByRole("button", { name: /more actions/i })).toBeDefined();
  });

  it("defaults to non-owner view (ProfileActions) when isOwner is omitted", () => {
    render(<ProfileView profile={fullProfile} />);
    expect(screen.getByRole("button", { name: /more actions/i })).toBeDefined();
  });
});
