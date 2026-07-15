import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VerifiedBadge, VerifiedName } from "../../src/components/profile/VerifiedBadge";

describe("VerifiedBadge", () => {
  it("renders with default identity type and tooltip", () => {
    render(<VerifiedBadge />);
    expect(screen.getByLabelText("Verified Identity")).toBeDefined();
  });

  it("renders celebrity type with correct label", () => {
    render(<VerifiedBadge verificationType="celebrity" showTooltip={false} />);
    expect(screen.getByLabelText("Celebrity Account")).toBeDefined();
  });

  it("renders official type with correct label", () => {
    render(<VerifiedBadge verificationType="official" showTooltip={false} />);
    expect(screen.getByLabelText("Official Account")).toBeDefined();
  });

  it("falls back to generic 'Verified' label for an unknown verification type", () => {
    render(<VerifiedBadge verificationType="mystery" showTooltip={false} />);
    expect(screen.getByLabelText("Verified")).toBeDefined();
  });

  it("does not wrap in a tooltip trigger when showTooltip is false", () => {
    const { container } = render(<VerifiedBadge showTooltip={false} />);
    // No tooltip wrapper span, badge (svg) is the top-level rendered node
    expect(container.querySelector("svg")).toBeDefined();
    expect(screen.queryByText("Verified Identity")).toBeNull();
  });

  it("applies the size class for sm/md/lg", () => {
    const { container: sm } = render(<VerifiedBadge size="sm" showTooltip={false} />);
    expect(sm.querySelector("svg")?.getAttribute("class")).toContain("h-3.5");

    const { container: lg } = render(<VerifiedBadge size="lg" showTooltip={false} />);
    expect(lg.querySelector("svg")?.getAttribute("class")).toContain("h-5");
  });

  it("applies a custom className", () => {
    const { container } = render(
      <VerifiedBadge showTooltip={false} className="custom-badge-class" />
    );
    expect(container.querySelector("svg")?.getAttribute("class")).toContain(
      "custom-badge-class"
    );
  });
});

describe("VerifiedName", () => {
  it("renders the name without a badge when not verified", () => {
    const { container } = render(<VerifiedName name="Jane Doe" isVerified={false} />);
    expect(screen.getByText("Jane Doe")).toBeDefined();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders the name with a badge when verified", () => {
    const { container } = render(
      <VerifiedName name="Jane Doe" isVerified={true} verificationType="official" />
    );
    expect(screen.getByText("Jane Doe")).toBeDefined();
    expect(container.querySelector("svg")).toBeDefined();
    expect(screen.getByLabelText("Official Account")).toBeDefined();
  });

  it("applies nameClassName to the name span", () => {
    render(
      <VerifiedName name="Jane Doe" isVerified={false} nameClassName="special-name-class" />
    );
    expect(screen.getByText("Jane Doe").className).toContain("special-name-class");
  });
});
