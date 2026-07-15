import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CompletionTips } from "../../src/components/profile/CompletionTips";
import { CompletionTip } from "../../src/types/profile";

const criticalTip: CompletionTip = {
  field: "bio",
  label: "Add a bio",
  category: "critical",
  tab: "basics",
  weight: 5,
  quick_win: true,
};

const importantTip: CompletionTip = {
  field: "occupation",
  label: "Add your occupation",
  category: "important",
  tab: "professional",
  weight: 2.5,
  quick_win: false,
};

const niceToHaveTip: CompletionTip = {
  field: "university",
  label: "Add your university",
  category: "nice_to_have",
  tab: "professional",
  weight: 1,
  quick_win: false,
};

describe("CompletionTips", () => {
  it("shows the empty state when there are no tips", () => {
    render(<CompletionTips tips={[]} />);
    expect(screen.getByText(/your profile is looking great/i)).toBeDefined();
  });

  it("does not render the 'Quick Wins' heading in the empty state", () => {
    render(<CompletionTips tips={[]} />);
    expect(screen.queryByText(/quick wins/i)).toBeNull();
  });

  it("renders a tip with its label and category badge", () => {
    render(<CompletionTips tips={[criticalTip]} />);
    expect(screen.getByText("Add a bio")).toBeDefined();
    expect(screen.getByText("High Impact")).toBeDefined();
  });

  it("renders the correct label per category", () => {
    render(<CompletionTips tips={[importantTip, niceToHaveTip]} />);
    expect(screen.getByText("Medium Impact")).toBeDefined();
    expect(screen.getByText("Nice to Have")).toBeDefined();
  });

  it("shows the weight as a formatted percentage", () => {
    render(<CompletionTips tips={[criticalTip]} />);
    expect(screen.getByText("+5.0%")).toBeDefined();
  });

  it("calls onTipClick with the clicked tip", () => {
    const onTipClick = vi.fn();
    render(<CompletionTips tips={[criticalTip]} onTipClick={onTipClick} />);

    fireEvent.click(screen.getByText("Add a bio"));

    expect(onTipClick).toHaveBeenCalledWith(criticalTip);
  });

  it("does not throw when clicked without an onTipClick handler", () => {
    render(<CompletionTips tips={[criticalTip]} />);
    expect(() => fireEvent.click(screen.getByText("Add a bio"))).not.toThrow();
  });

  it("renders multiple tips as separate list items", () => {
    render(<CompletionTips tips={[criticalTip, importantTip, niceToHaveTip]} />);
    expect(screen.getAllByRole("listitem").length).toBe(3);
  });
});
