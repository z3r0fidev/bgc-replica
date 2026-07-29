import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageTransition } from "../../src/components/layout/PageTransition";

describe("PageTransition", () => {
  it("renders its children through a CSS-animated wrapper", () => {
    render(
      <PageTransition>
        <p>Page content</p>
      </PageTransition>
    );
    expect(screen.getByText("Page content")).toBeDefined();
    expect(screen.getByText("Page content").parentElement).toHaveClass("animate-in");
  });

  it("renders multiple children", () => {
    render(
      <PageTransition>
        <span>First</span>
        <span>Second</span>
      </PageTransition>
    );
    expect(screen.getByText("First")).toBeDefined();
    expect(screen.getByText("Second")).toBeDefined();
  });
});
