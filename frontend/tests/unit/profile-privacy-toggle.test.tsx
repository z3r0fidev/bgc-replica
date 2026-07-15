import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrivacyToggle } from "../../src/components/profile/edit/PrivacyToggle";

// jsdom doesn't implement pointer capture / scrollIntoView, which the underlying
// Radix Select needs in order to open its listbox during interaction tests.
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false);
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || (() => {});
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || (() => {});
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

function openSelect(testId: string) {
  const trigger = screen.getByTestId(testId);
  fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse", ctrlKey: false });
  fireEvent.click(trigger);
  return trigger;
}

describe("PrivacyToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a trigger with a testid and aria-label scoped to the field", () => {
    render(<PrivacyToggle field="bio" value="PUBLIC" onChange={vi.fn()} />);
    const trigger = screen.getByTestId("privacy-toggle-bio");
    expect(trigger).toBeDefined();
    expect(trigger.getAttribute("aria-label")).toBe("Privacy setting for bio");
  });

  it("humanizes underscored field names in the aria-label", () => {
    render(
      <PrivacyToggle field="gender_identity" value="PUBLIC" onChange={vi.fn()} />
    );
    const trigger = screen.getByTestId("privacy-toggle-gender_identity");
    expect(trigger.getAttribute("aria-label")).toBe(
      "Privacy setting for gender identity"
    );
  });

  it("displays the current value's label", () => {
    render(<PrivacyToggle field="bio" value="FRIENDS_ONLY" onChange={vi.fn()} />);
    expect(screen.getByText("Friends Only")).toBeDefined();
  });

  it("shows all three privacy options when opened", async () => {
    render(<PrivacyToggle field="bio" value="PUBLIC" onChange={vi.fn()} />);
    openSelect("privacy-toggle-bio");

    expect(await screen.findByRole("option", { name: /friends only/i })).toBeDefined();
    expect(screen.getByRole("option", { name: /^private$/i })).toBeDefined();
    // "Public" appears both in the trigger and as an option
    expect(screen.getAllByText("Public").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onChange with the field name and the newly selected level", async () => {
    const onChange = vi.fn();
    render(<PrivacyToggle field="pronouns" value="PUBLIC" onChange={onChange} />);
    openSelect("privacy-toggle-pronouns");

    const privateOption = await screen.findByRole("option", { name: /^private$/i });
    fireEvent.pointerUp(privateOption);
    fireEvent.click(privateOption);

    expect(onChange).toHaveBeenCalledWith("pronouns", "PRIVATE");
  });
});
