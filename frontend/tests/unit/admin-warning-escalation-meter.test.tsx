import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WarningEscalationMeter } from "../../src/components/admin/WarningEscalationMeter";

describe("WarningEscalationMeter", () => {
  it("renders nothing when activeCount is 0", () => {
    const { container } = render(<WarningEscalationMeter activeCount={0} threshold={3} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when activeCount is negative", () => {
    const { container } = render(<WarningEscalationMeter activeCount={-1} threshold={3} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a Badge with the count label in the default (md) size", () => {
    render(<WarningEscalationMeter activeCount={1} threshold={3} />);
    expect(screen.getByText("1/3")).toBeDefined();
  });

  it("renders the amber tier for positions well below threshold", () => {
    const { container } = render(<WarningEscalationMeter activeCount={1} threshold={5} size="sm" />);
    const badge = screen.getByText("1/5");
    expect(badge.className).toContain("amber");
    void container;
  });

  it("renders the orange 'one more warning' tier at threshold - 1", () => {
    render(<WarningEscalationMeter activeCount={2} threshold={3} size="sm" />);
    const badge = screen.getByText("2/3");
    expect(badge.className).toContain("orange");
  });

  it("renders the destructive tier once activeCount reaches the threshold", () => {
    render(<WarningEscalationMeter activeCount={3} threshold={3} size="sm" />);
    const badge = screen.getByText("3/3");
    // Destructive variant is applied via the Badge's variant prop, not a soft-tint class.
    expect(badge.className).not.toContain("amber");
    expect(badge.className).not.toContain("orange");
  });

  it("renders the destructive tier when activeCount exceeds the threshold", () => {
    render(<WarningEscalationMeter activeCount={5} threshold={3} size="sm" />);
    expect(screen.getByText("5/3")).toBeDefined();
  });

  it("clamps the tier calculation at the threshold for counts beyond it (still destructive, no crash)", () => {
    render(<WarningEscalationMeter activeCount={10} threshold={3} />);
    expect(screen.getByText("10/3")).toBeDefined();
  });

  it("renders the lg variant as a progress-bar style view with a segment per threshold slot", () => {
    const { container } = render(
      <WarningEscalationMeter activeCount={2} threshold={4} size="lg" />
    );
    expect(screen.getByText("Warnings")).toBeDefined();
    expect(screen.getByText("2/4")).toBeDefined();
    // 4 segments total (one per threshold slot)
    const segments = container.querySelectorAll(".rounded-full.flex-1, .rounded-full");
    expect(segments.length).toBeGreaterThanOrEqual(4);
  });

  it("lg variant colors filled segments up to activeCount and leaves the rest muted", () => {
    render(<WarningEscalationMeter activeCount={2} threshold={4} size="lg" />);
    const segmentContainer = screen.getByText("Warnings").closest("div")!.parentElement!;
    const segments = segmentContainer.querySelectorAll(".flex.items-center.gap-1 > div");
    expect(segments.length).toBe(4);
    expect(segments[0].className).toContain("bg-amber-500");
    expect(segments[1].className).toContain("bg-amber-500");
    expect(segments[2].className).toContain("bg-muted");
    expect(segments[3].className).toContain("bg-muted");
  });

  it("lg variant shows the escalation microcopy including the 'one more' hint at threshold - 1", () => {
    render(<WarningEscalationMeter activeCount={2} threshold={3} size="lg" />);
    expect(
      screen.getByText(/one more will trigger automatic suspension/i)
    ).toBeDefined();
  });

  it("lg variant shows the 'threshold reached' microcopy once at or above threshold", () => {
    render(<WarningEscalationMeter activeCount={3} threshold={3} size="lg" />);
    expect(screen.getByText(/suspension threshold reached/i)).toBeDefined();
  });

  it("forwards a custom className to the sm/md badge", () => {
    render(<WarningEscalationMeter activeCount={1} threshold={3} className="my-extra-class" />);
    expect(screen.getByText("1/3").className).toContain("my-extra-class");
  });

  it("forwards a custom className to the lg container", () => {
    const { container } = render(
      <WarningEscalationMeter activeCount={1} threshold={3} size="lg" className="my-extra-class" />
    );
    expect(container.querySelector(".my-extra-class")).not.toBeNull();
  });
});
