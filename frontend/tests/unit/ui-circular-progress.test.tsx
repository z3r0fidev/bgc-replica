import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CircularProgress } from "../../src/components/ui/circular-progress";

describe("CircularProgress", () => {
  it("renders the percentage as text by default", () => {
    render(<CircularProgress percentage={42} />);

    expect(screen.getByText("42%")).toBeDefined();
  });

  it("hides the percentage text when showPercentage=false", () => {
    render(<CircularProgress percentage={42} showPercentage={false} />);

    expect(screen.queryByText("42%")).toBeNull();
  });

  it("renders label and sublabel when provided", () => {
    render(<CircularProgress percentage={50} label="Profile" sublabel="complete" />);

    expect(screen.getByText("Profile")).toBeDefined();
    expect(screen.getByText("complete")).toBeDefined();
  });

  it("does not render label/sublabel elements when not provided", () => {
    render(<CircularProgress percentage={50} />);

    // Only the percentage span should be present in the center content
    expect(screen.queryByText("Profile")).toBeNull();
  });

  it("computes strokeDashoffset of 0 for 100% (fully filled ring)", () => {
    const { container } = render(<CircularProgress percentage={100} size={120} strokeWidth={8} />);

    const circles = container.querySelectorAll("circle");
    // second circle is the progress arc
    const progressCircle = circles[1];
    const offset = parseFloat(progressCircle.getAttribute("stroke-dashoffset") || "");
    expect(offset).toBeCloseTo(0, 5);
  });

  it("computes strokeDashoffset equal to circumference for 0% (empty ring)", () => {
    const size = 120;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    const { container } = render(
      <CircularProgress percentage={0} size={size} strokeWidth={strokeWidth} />
    );

    const circles = container.querySelectorAll("circle");
    const progressCircle = circles[1];
    const offset = parseFloat(progressCircle.getAttribute("stroke-dashoffset") || "");
    expect(offset).toBeCloseTo(circumference, 5);
  });

  it("computes a partial strokeDashoffset for 50%", () => {
    const size = 120;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const expectedOffset = circumference - 0.5 * circumference;

    const { container } = render(
      <CircularProgress percentage={50} size={size} strokeWidth={strokeWidth} />
    );

    const circles = container.querySelectorAll("circle");
    const progressCircle = circles[1];
    const offset = parseFloat(progressCircle.getAttribute("stroke-dashoffset") || "");
    expect(offset).toBeCloseTo(expectedOffset, 5);
  });

  it("uses the red stroke color class for low percentages (<25%)", () => {
    const { container } = render(<CircularProgress percentage={10} />);

    const circles = container.querySelectorAll("circle");
    expect(circles[1].getAttribute("class")).toContain("stroke-red-500");
  });

  it("uses the orange stroke color class for percentages in [25,50)", () => {
    const { container } = render(<CircularProgress percentage={30} />);

    const circles = container.querySelectorAll("circle");
    expect(circles[1].getAttribute("class")).toContain("stroke-orange-500");
  });

  it("uses the yellow stroke color class for percentages in [50,80)", () => {
    const { container } = render(<CircularProgress percentage={60} />);

    const circles = container.querySelectorAll("circle");
    expect(circles[1].getAttribute("class")).toContain("stroke-yellow-500");
  });

  it("uses the green stroke color class for percentages >= 80", () => {
    const { container } = render(<CircularProgress percentage={90} />);

    const circles = container.querySelectorAll("circle");
    expect(circles[1].getAttribute("class")).toContain("stroke-green-500");
  });

  it("respects a custom size prop for the svg dimensions", () => {
    const { container } = render(<CircularProgress percentage={50} size={200} />);

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("200");
    expect(svg?.getAttribute("height")).toBe("200");
  });
});
