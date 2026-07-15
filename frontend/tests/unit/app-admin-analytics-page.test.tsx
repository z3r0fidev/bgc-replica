import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AnalyticsPage from "../../src/app/(protected)/admin/analytics/page";
import { adminService } from "../../src/services/adminService";

vi.mock("../../src/services/adminService", () => ({
  adminService: {
    getAnalyticsOverview: vi.fn(),
  },
}));

const dataWithSeries = {
  user_growth: [{ date: "2024-01-01", count: 5 }],
  engagement: [{ date: "2024-01-01", posts: 3, comments: 7 }],
  total_posts: 100,
  total_comments: 200,
  total_threads: 10,
  total_forum_posts: 50,
  verified_profiles: 25,
  dau: 12,
  wau: 40,
  mau: 90,
};

const emptyData = {
  user_growth: [],
  engagement: [],
  total_posts: 0,
  total_comments: 0,
  total_threads: 0,
  total_forum_posts: 0,
  verified_profiles: 0,
  dau: 0,
  wau: 0,
  mau: 0,
};

describe("AnalyticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    // jsdom doesn't implement ResizeObserver, but recharts' ResponsiveContainer
    // requires it to measure and render its children.
    class MockResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  it("shows a loading spinner before data resolves", () => {
    vi.mocked(adminService.getAnalyticsOverview).mockReturnValue(
      new Promise(() => {})
    );
    const { container } = render(<AnalyticsPage />);
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("renders key metrics and content stats once loaded", async () => {
    vi.mocked(adminService.getAnalyticsOverview).mockResolvedValue(dataWithSeries);
    render(<AnalyticsPage />);

    await waitFor(() => expect(screen.getByText("12")).toBeDefined());
    expect(screen.getByText("40")).toBeDefined();
    expect(screen.getByText("90")).toBeDefined();
    expect(screen.getByText("25")).toBeDefined();
    expect(screen.getByText("100")).toBeDefined();
    expect(screen.getByText("200")).toBeDefined();
    expect(screen.getByText("10")).toBeDefined();
    expect(screen.getByText("50")).toBeDefined();
  });

  it("calls getAnalyticsOverview with the default 30-day window on mount", async () => {
    vi.mocked(adminService.getAnalyticsOverview).mockResolvedValue(dataWithSeries);
    render(<AnalyticsPage />);
    await waitFor(() =>
      expect(adminService.getAnalyticsOverview).toHaveBeenCalledWith(30)
    );
  });

  it("shows empty-state copy for growth/engagement charts when series are empty", async () => {
    vi.mocked(adminService.getAnalyticsOverview).mockResolvedValue(emptyData);
    render(<AnalyticsPage />);

    await waitFor(() =>
      expect(screen.getByText("No user growth data available")).toBeDefined()
    );
    expect(screen.getByText("No engagement data available")).toBeDefined();
  });

  it("shows an error card with retry on failure", async () => {
    vi.mocked(adminService.getAnalyticsOverview).mockRejectedValue(
      new Error("analytics down")
    );
    render(<AnalyticsPage />);

    await waitFor(() =>
      expect(screen.getByText("Error Loading Analytics")).toBeDefined()
    );
    expect(screen.getByText("analytics down")).toBeDefined();

    vi.mocked(adminService.getAnalyticsOverview).mockResolvedValue(dataWithSeries);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByText("12")).toBeDefined());
  });

  it("clicking Refresh re-fetches with the current day range", async () => {
    vi.mocked(adminService.getAnalyticsOverview).mockResolvedValue(dataWithSeries);
    render(<AnalyticsPage />);

    await waitFor(() =>
      expect(adminService.getAnalyticsOverview).toHaveBeenCalledTimes(1)
    );
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() =>
      expect(adminService.getAnalyticsOverview).toHaveBeenCalledTimes(2)
    );
  });

  it("changing the day-range Select re-fetches with the new value", async () => {
    vi.mocked(adminService.getAnalyticsOverview).mockResolvedValue(dataWithSeries);
    render(<AnalyticsPage />);

    await waitFor(() =>
      expect(adminService.getAnalyticsOverview).toHaveBeenCalledWith(30)
    );

    fireEvent.click(screen.getByRole("combobox"));
    const option = await screen.findByRole("option", { name: "Last 7 days" });
    fireEvent.click(option);

    await waitFor(() =>
      expect(adminService.getAnalyticsOverview).toHaveBeenCalledWith(7)
    );
  });
});
