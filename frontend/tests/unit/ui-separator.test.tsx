import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Separator } from "../../src/components/ui/separator";

describe("Separator", () => {
  it("defaults to horizontal orientation classes and role=none (decorative)", () => {
    render(<Separator data-testid="sep" />);

    const sep = screen.getByTestId("sep");
    expect(sep.className).toContain("h-[1px]");
    expect(sep.className).toContain("w-full");
    expect(sep.getAttribute("role")).toBe("none");
  });

  it("applies vertical orientation classes when orientation=vertical", () => {
    render(<Separator orientation="vertical" data-testid="sep" />);

    const sep = screen.getByTestId("sep");
    expect(sep.className).toContain("h-full");
    expect(sep.className).toContain("w-[1px]");
  });

  it("exposes role=separator and aria-orientation when decorative=false", () => {
    render(<Separator decorative={false} orientation="vertical" data-testid="sep" />);

    const sep = screen.getByTestId("sep");
    expect(sep.getAttribute("role")).toBe("separator");
    expect(sep.getAttribute("aria-orientation")).toBe("vertical");
  });

  it("omits aria-orientation when decorative (default)", () => {
    render(<Separator data-testid="sep" />);

    const sep = screen.getByTestId("sep");
    expect(sep.hasAttribute("aria-orientation")).toBe(false);
  });

  it("merges a custom className with the base classes", () => {
    render(<Separator className="my-separator-class" data-testid="sep" />);

    const sep = screen.getByTestId("sep");
    expect(sep.className).toContain("my-separator-class");
    expect(sep.className).toContain("bg-border");
  });

  it("forwards a ref to the underlying div", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Separator ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("DIV");
  });
});
