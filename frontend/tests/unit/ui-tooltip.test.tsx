import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "../../src/components/ui/tooltip";

// Radix renders the tooltip text twice when open: once in the visible,
// positioned content element, and once in a visually-hidden <span
// role="tooltip"> used for screen readers. getByText("...") is therefore
// ambiguous once open; querying by the visible content's data-slot avoids that.
function getVisibleTooltipContent() {
  return document.querySelector('[data-slot="tooltip-content"]');
}

describe("Tooltip", () => {
  // jsdom has no ResizeObserver; Radix's internal useSize hook (used to
  // measure the arrow) needs a stub to avoid throwing on mount.
  beforeEach(() => {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    global.ResizeObserver = ResizeObserverStub;
  });

  it("does not render the tooltip content before the trigger is focused/hovered", () => {
    render(
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Helpful info</TooltipContent>
      </Tooltip>
    );

    expect(getVisibleTooltipContent()).toBeNull();
  });

  it("shows the tooltip content when the trigger receives focus", async () => {
    render(
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Helpful info</TooltipContent>
      </Tooltip>
    );

    fireEvent.focus(screen.getByText("Hover me"));

    await waitFor(() => {
      expect(getVisibleTooltipContent()).not.toBeNull();
    });
    // The visible content also nests Radix's visually-hidden a11y duplicate
    // span, so textContent contains the string (possibly more than once).
    expect(getVisibleTooltipContent()?.textContent).toContain("Helpful info");
  });

  it("hides the tooltip content when the trigger is blurred", async () => {
    render(
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Helpful info</TooltipContent>
      </Tooltip>
    );

    fireEvent.focus(screen.getByText("Hover me"));
    await waitFor(() => expect(getVisibleTooltipContent()).not.toBeNull());

    fireEvent.blur(screen.getByText("Hover me"));

    await waitFor(() => {
      expect(getVisibleTooltipContent()).toBeNull();
    });
  });

  it("merges a custom className on TooltipContent alongside base classes", async () => {
    render(
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent className="my-tooltip-class">Helpful info</TooltipContent>
      </Tooltip>
    );

    fireEvent.focus(screen.getByText("Hover me"));

    await waitFor(() => {
      expect(getVisibleTooltipContent()?.className).toContain("my-tooltip-class");
    });
  });

  it("wraps children in its own TooltipProvider so nesting an explicit TooltipProvider is optional", async () => {
    // Rendering without an explicit external TooltipProvider must still work,
    // since Tooltip itself wraps its subtree in one.
    render(
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Helpful info</TooltipContent>
      </Tooltip>
    );

    fireEvent.focus(screen.getByText("Hover me"));

    await waitFor(() => {
      expect(getVisibleTooltipContent()).not.toBeNull();
    });
  });

  it("also works when explicitly wrapped in an outer TooltipProvider", async () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Helpful info</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    fireEvent.focus(screen.getByText("Hover me"));

    await waitFor(() => {
      expect(getVisibleTooltipContent()).not.toBeNull();
    });
  });
});
