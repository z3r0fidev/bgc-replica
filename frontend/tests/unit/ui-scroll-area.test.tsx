import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScrollArea, ScrollBar } from "../../src/components/ui/scroll-area";

describe("ScrollArea", () => {
  // jsdom has no ResizeObserver; Radix's Scrollbar/Thumb use it to measure
  // sizes for the thumb-drag math. A no-op stub is enough for render/mount.
  beforeEach(() => {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    global.ResizeObserver = ResizeObserverStub;
  });


  it("renders its children inside the scrollable viewport", () => {
    render(
      <ScrollArea>
        <div>Scrollable content</div>
      </ScrollArea>
    );

    expect(screen.getByText("Scrollable content")).toBeDefined();
  });

  it("merges a custom className on the root alongside the base relative class", () => {
    render(
      <ScrollArea className="my-scroll-class" data-testid="scroll-root">
        <div>content</div>
      </ScrollArea>
    );

    const root = screen.getByTestId("scroll-root");
    expect(root.className).toContain("my-scroll-class");
    expect(root.className).toContain("relative");
  });

  it("sets data-slot=scroll-area on the root and scroll-area-viewport on the viewport", () => {
    render(
      <ScrollArea data-testid="scroll-root">
        <div>content</div>
      </ScrollArea>
    );

    const root = screen.getByTestId("scroll-root");
    expect(root.getAttribute("data-slot")).toBe("scroll-area");

    const viewport = root.querySelector('[data-slot="scroll-area-viewport"]');
    expect(viewport).not.toBeNull();
  });

  it("defaults ScrollBar orientation to vertical with the vertical-specific classes", () => {
    // Radix's default scrollbar type is "hover", which gates rendering behind
    // a hover state machine *and* a ResizeObserver-driven overflow check that
    // jsdom can't satisfy (zero-sized elements never appear to overflow).
    // type="always" renders the scrollbar unconditionally so the class logic
    // used by this project's ScrollBar wrapper is directly testable.
    render(
      <ScrollArea type="always">
        <ScrollBar data-testid="scrollbar" />
      </ScrollArea>
    );

    const scrollbar = screen.getByTestId("scrollbar");
    expect(scrollbar.className).toContain("h-full");
    expect(scrollbar.className).toContain("w-2.5");
  });

  it("applies horizontal-specific classes when orientation=horizontal", () => {
    render(
      <ScrollArea type="always">
        <ScrollBar orientation="horizontal" data-testid="scrollbar" />
      </ScrollArea>
    );

    const scrollbar = screen.getByTestId("scrollbar");
    expect(scrollbar.className).toContain("h-2.5");
    expect(scrollbar.className).toContain("flex-col");
  });
});
