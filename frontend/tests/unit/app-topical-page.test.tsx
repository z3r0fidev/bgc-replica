import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import TopicalHubPage from "../../src/app/(protected)/topical/[slug]/page";

let mockSlug = "hot-topics";
vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: mockSlug }),
}));

describe("TopicalHubPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSlug = "hot-topics";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a loading state, then renders the formatted topic name and description after the simulated fetch", () => {
    render(<TopicalHubPage />);

    expect(screen.getByText(/curating topical content/i)).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByRole("heading", { name: "Hot Topics" })).toBeDefined();
    expect(
      screen.getByText(/Everything you need to know about Hot Topics/i)
    ).toBeDefined();
  });

  it("title-cases a single-word slug", () => {
    mockSlug = "wellness";
    render(<TopicalHubPage />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByRole("heading", { name: "Wellness" })).toBeDefined();
  });

  it("shows the empty feed state and the empty forums state by default (no data source populates them)", () => {
    render(<TopicalHubPage />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/no feed updates yet/i)).toBeDefined();

    // Radix TabsTrigger switches tabs on mousedown, not click.
    fireEvent.mouseDown(screen.getByRole("tab", { name: /related forums/i }), { button: 0 });

    expect(screen.getByText(/no active forum threads/i)).toBeDefined();
  });
});
