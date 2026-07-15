import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageTransition } from "../../src/components/layout/PageTransition";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
}));

describe("PageTransition", () => {
  it("renders its children through the motion.div wrapper", () => {
    render(
      <PageTransition>
        <p>Page content</p>
      </PageTransition>
    );
    expect(screen.getByText("Page content")).toBeDefined();
    expect(screen.getByTestId("motion-div")).toBeDefined();
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
