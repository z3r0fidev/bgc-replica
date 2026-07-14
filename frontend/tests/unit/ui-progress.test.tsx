import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Progress } from "../../src/components/ui/progress";

describe("Progress", () => {
  it("renders the inner bar width proportional to value/max (default max=100)", () => {
    render(<Progress value={40} data-testid="progress" />);

    const track = screen.getByTestId("progress");
    const bar = track.firstElementChild as HTMLElement;
    expect(bar.style.width).toBe("40%");
  });

  it("computes percentage relative to a custom max", () => {
    render(<Progress value={5} max={10} data-testid="progress" />);

    const track = screen.getByTestId("progress");
    const bar = track.firstElementChild as HTMLElement;
    expect(bar.style.width).toBe("50%");
  });

  it("clamps the width to 100% when value exceeds max", () => {
    render(<Progress value={150} max={100} data-testid="progress" />);

    const track = screen.getByTestId("progress");
    const bar = track.firstElementChild as HTMLElement;
    expect(bar.style.width).toBe("100%");
  });

  it("clamps the width to 0% when value is negative", () => {
    render(<Progress value={-20} data-testid="progress" />);

    const track = screen.getByTestId("progress");
    const bar = track.firstElementChild as HTMLElement;
    expect(bar.style.width).toBe("0%");
  });

  it("defaults value to 0 when not provided", () => {
    render(<Progress data-testid="progress" />);

    const track = screen.getByTestId("progress");
    const bar = track.firstElementChild as HTMLElement;
    expect(bar.style.width).toBe("0%");
  });

  it("merges a custom className with the base track classes", () => {
    render(<Progress value={10} className="my-progress-class" data-testid="progress" />);

    const track = screen.getByTestId("progress");
    expect(track.className).toContain("my-progress-class");
    expect(track.className).toContain("rounded-full");
  });

  it("forwards a ref to the underlying track div", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Progress ref={ref} value={10} />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("DIV");
  });
});
