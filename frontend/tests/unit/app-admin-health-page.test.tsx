import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import HealthPage from "../../src/app/(protected)/admin/health/page";
import { adminService } from "../../src/services/adminService";

vi.mock("../../src/services/adminService", () => ({
  adminService: {
    getSystemHealth: vi.fn(),
  },
}));

const healthyData = {
  status: "healthy" as const,
  database: { status: "up" as const, connections: 5, pool_size: 20, cache_hit_ratio: 98.5 },
  redis: { status: "up" as const, memory_used: "12MB", ops_per_sec: 500, connected_clients: 3 },
  error_count_24h: 0,
  uptime_seconds: 90061, // 1d 1h 1m
};

describe("HealthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("shows a loading spinner before health data resolves", () => {
    vi.mocked(adminService.getSystemHealth).mockReturnValue(new Promise(() => {}));
    const { container } = render(<HealthPage />);
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("renders overall status and service cards once loaded", async () => {
    vi.mocked(adminService.getSystemHealth).mockResolvedValue(healthyData);
    render(<HealthPage />);

    await waitFor(() =>
      expect(screen.getByText("Overall System Status")).toBeDefined()
    );
    expect(screen.getAllByText("Healthy").length).toBeGreaterThan(0);
    expect(screen.getByText("5 / 20")).toBeDefined();
    expect(screen.getByText("98.5%")).toBeDefined();
    expect(screen.getByText("12MB")).toBeDefined();
    expect(screen.getByText("500")).toBeDefined();
  });

  it("formats uptime with days, hours and minutes", async () => {
    vi.mocked(adminService.getSystemHealth).mockResolvedValue(healthyData);
    render(<HealthPage />);

    await waitFor(() => expect(screen.getAllByText("1d 1h 1m").length).toBeGreaterThan(0));
  });

  it("formats uptime with just hours and minutes when under a day", async () => {
    vi.mocked(adminService.getSystemHealth).mockResolvedValue({
      ...healthyData,
      uptime_seconds: 3661, // 1h 1m
    });
    render(<HealthPage />);

    await waitFor(() => expect(screen.getAllByText("1h 1m").length).toBeGreaterThan(0));
  });

  it("formats uptime with just minutes when under an hour", async () => {
    vi.mocked(adminService.getSystemHealth).mockResolvedValue({
      ...healthyData,
      uptime_seconds: 120,
    });
    render(<HealthPage />);

    await waitFor(() => expect(screen.getAllByText("2m").length).toBeGreaterThan(0));
  });

  it("shows a degraded badge for a degraded status", async () => {
    vi.mocked(adminService.getSystemHealth).mockResolvedValue({
      ...healthyData,
      status: "degraded",
    });
    render(<HealthPage />);

    await waitFor(() => expect(screen.getAllByText("Degraded").length).toBeGreaterThan(0));
  });

  it("shows an unhealthy badge and down services for an unhealthy status", async () => {
    vi.mocked(adminService.getSystemHealth).mockResolvedValue({
      ...healthyData,
      status: "unhealthy",
      database: { ...healthyData.database, status: "down" },
      redis: { ...healthyData.redis, status: "down" },
    });
    render(<HealthPage />);

    await waitFor(() => expect(screen.getAllByText("Unhealthy").length).toBeGreaterThan(0));
  });

  it("highlights the error count in orange when errors exist", async () => {
    vi.mocked(adminService.getSystemHealth).mockResolvedValue({
      ...healthyData,
      error_count_24h: 7,
    });
    render(<HealthPage />);

    await waitFor(() => {
      const el = screen.getByText("7");
      expect(el.className).toContain("text-orange-600");
    });
  });

  it("shows an error card with retry when the initial load fails", async () => {
    vi.mocked(adminService.getSystemHealth).mockRejectedValue(new Error("health down"));
    render(<HealthPage />);

    await waitFor(() =>
      expect(screen.getByText("Error Loading Health Data")).toBeDefined()
    );
    expect(screen.getByText("health down")).toBeDefined();

    vi.mocked(adminService.getSystemHealth).mockResolvedValue(healthyData);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByText("Overall System Status")).toBeDefined());
  });

  it("clicking Refresh re-fetches health data", async () => {
    vi.mocked(adminService.getSystemHealth).mockResolvedValue(healthyData);
    render(<HealthPage />);

    await waitFor(() => expect(adminService.getSystemHealth).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => expect(adminService.getSystemHealth).toHaveBeenCalledTimes(2));
  });

  it("auto-refreshes every 30 seconds and stops after unmount", async () => {
    vi.useFakeTimers();
    vi.mocked(adminService.getSystemHealth).mockResolvedValue(healthyData);
    const { unmount } = render(<HealthPage />);

    await vi.waitFor(() =>
      expect(adminService.getSystemHealth).toHaveBeenCalledTimes(1)
    );

    await vi.advanceTimersByTimeAsync(30000);
    expect(adminService.getSystemHealth).toHaveBeenCalledTimes(2);

    unmount();
    await vi.advanceTimersByTimeAsync(60000);
    expect(adminService.getSystemHealth).toHaveBeenCalledTimes(2);
  });
});
