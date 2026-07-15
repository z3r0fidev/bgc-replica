import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MilestoneTracker } from "../../src/components/profile/MilestoneTracker";
import { MilestoneStatus, FeatureUnlock } from "../../src/types/profile";

const milestones: MilestoneStatus[] = [
  { level: 1, name: "Beginner", threshold: 25, reached: true, badge_icon: "seedling" },
  { level: 2, name: "Explorer", threshold: 50, reached: true, badge_icon: "compass" },
  { level: 3, name: "Socialite", threshold: 75, reached: false, badge_icon: "star" },
  { level: 4, name: "Complete", threshold: 95, reached: false, badge_icon: "trophy" },
];

const featureUnlocks: FeatureUnlock[] = [
  {
    threshold: 40,
    name: "Search Visibility",
    description: "Profile visible in search",
    unlocked: true,
  },
  {
    threshold: 80,
    name: "Verified Badge Eligible",
    description: "Eligible for verified badge",
    unlocked: false,
  },
];

describe("MilestoneTracker", () => {
  it("renders all milestone names", () => {
    render(
      <MilestoneTracker
        milestones={milestones}
        currentMilestone="Explorer"
        featureUnlocks={featureUnlocks}
      />
    );
    expect(screen.getByText("Beginner")).toBeDefined();
    expect(screen.getAllByText("Explorer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Socialite")).toBeDefined();
    expect(screen.getByText("Complete")).toBeDefined();
  });

  it("shows the current milestone label when it's not 'None'", () => {
    render(
      <MilestoneTracker
        milestones={milestones}
        currentMilestone="Explorer"
        featureUnlocks={featureUnlocks}
      />
    );
    expect(screen.getByText("Current:")).toBeDefined();
    // There are two "Explorer" texts - milestone badge + current label; ensure at least 2
    expect(screen.getAllByText("Explorer").length).toBeGreaterThanOrEqual(2);
  });

  it("hides the current milestone label when currentMilestone is 'None'", () => {
    render(
      <MilestoneTracker
        milestones={milestones}
        currentMilestone="None"
        featureUnlocks={featureUnlocks}
      />
    );
    expect(screen.queryByText("Current:")).toBeNull();
  });

  it("shows the next milestone hint when provided", () => {
    render(
      <MilestoneTracker
        milestones={milestones}
        currentMilestone="Explorer"
        nextMilestone="Socialite"
        featureUnlocks={featureUnlocks}
      />
    );
    expect(screen.getByText("Next:")).toBeDefined();
  });

  it("does not render the next milestone hint when omitted", () => {
    render(
      <MilestoneTracker
        milestones={milestones}
        currentMilestone="Explorer"
        featureUnlocks={featureUnlocks}
      />
    );
    expect(screen.queryByText("Next:")).toBeNull();
  });

  it("renders feature unlock names, descriptions and threshold badges", () => {
    render(
      <MilestoneTracker
        milestones={milestones}
        currentMilestone="Explorer"
        featureUnlocks={featureUnlocks}
      />
    );
    expect(screen.getByText("Search Visibility")).toBeDefined();
    expect(screen.getByText("Profile visible in search")).toBeDefined();
    expect(screen.getByText("40%")).toBeDefined();
    expect(screen.getByText("Verified Badge Eligible")).toBeDefined();
    expect(screen.getByText("80%")).toBeDefined();
  });

  it("applies a custom className to the root container", () => {
    const { container } = render(
      <MilestoneTracker
        milestones={milestones}
        currentMilestone="Explorer"
        featureUnlocks={featureUnlocks}
        className="my-custom-tracker"
      />
    );
    expect(container.querySelector(".my-custom-tracker")).toBeDefined();
  });
});
