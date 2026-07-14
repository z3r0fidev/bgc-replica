import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "../../src/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders a div with pulse animation and rounded base classes", () => {
    render(<Skeleton data-testid="skeleton" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton.tagName).toBe("DIV");
    expect(skeleton.className).toContain("animate-pulse");
    expect(skeleton.className).toContain("rounded-md");
  });

  it("sets data-slot=skeleton on the rendered element", () => {
    render(<Skeleton data-testid="skeleton" />);

    expect(screen.getByTestId("skeleton").getAttribute("data-slot")).toBe("skeleton");
  });

  it("merges a custom className alongside the base classes", () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-40" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton.className).toContain("h-4");
    expect(skeleton.className).toContain("w-40");
    expect(skeleton.className).toContain("animate-pulse");
  });

  it("passes through arbitrary props to the underlying div", () => {
    render(<Skeleton data-testid="skeleton" aria-label="loading" />);

    expect(screen.getByTestId("skeleton").getAttribute("aria-label")).toBe("loading");
  });
});
