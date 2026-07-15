import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Template from "../../src/app/template";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock("../../src/components/layout/PageTransition", () => ({
  PageTransition: ({ children }: React.PropsWithChildren) => (
    <div data-testid="page-transition">{children}</div>
  ),
}));

describe("Template", () => {
  it("renders children through AnimatePresence and PageTransition", () => {
    render(
      <Template>
        <div>page content</div>
      </Template>
    );

    expect(screen.getByTestId("page-transition")).toBeDefined();
    expect(screen.getByText("page content")).toBeDefined();
  });
});
