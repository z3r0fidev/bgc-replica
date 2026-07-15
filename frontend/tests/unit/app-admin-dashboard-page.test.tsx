import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminDashboard from "../../src/app/(protected)/admin/page";
import { adminService } from "../../src/services/adminService";

vi.mock("../../src/services/adminService", () => ({
  adminService: {
    getStats: vi.fn(),
  },
}));

const baseStats = {
  total_users: 100,
  active_users: 80,
  suspended_users: 5,
  banned_users: 2,
  admin_users: 3,
  new_users_today: 4,
  new_users_this_week: 10,
  new_users_this_month: 30,
};

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading spinner before stats resolve", () => {
    vi.mocked(adminService.getStats).mockReturnValue(new Promise(() => {}));
    const { container } = render(<AdminDashboard />);
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("renders stats once loaded", async () => {
    vi.mocked(adminService.getStats).mockResolvedValue(baseStats);
    render(<AdminDashboard />);

    await waitFor(() => expect(screen.getByText("Dashboard")).toBeDefined());
    expect(screen.getByText("100")).toBeDefined();
    expect(screen.getByText("80 active")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
    expect(screen.getByText("10")).toBeDefined();
    expect(screen.getByText("30")).toBeDefined();
  });

  it("renders quick links to Manage Users and Moderation Queue", async () => {
    vi.mocked(adminService.getStats).mockResolvedValue(baseStats);
    render(<AdminDashboard />);

    await waitFor(() => expect(screen.getByText("Dashboard")).toBeDefined());
    const usersLink = screen.getByText("Manage Users").closest("a");
    const modLink = screen.getByText("Moderation Queue").closest("a");
    expect(usersLink?.getAttribute("href")).toBe("/admin/users");
    expect(modLink?.getAttribute("href")).toBe("/admin/moderation");
  });

  it("shows an error card with retry when loading stats fails", async () => {
    vi.mocked(adminService.getStats).mockRejectedValue(new Error("boom"));
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Error Loading Dashboard")).toBeDefined();
    });
    expect(screen.getByText("boom")).toBeDefined();

    vi.mocked(adminService.getStats).mockResolvedValue(baseStats);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByText("Dashboard")).toBeDefined());
  });

  it("falls back to a generic error message when a non-Error is thrown", async () => {
    vi.mocked(adminService.getStats).mockRejectedValue("some string");
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load stats")).toBeDefined();
    });
  });

  it("clicking Refresh re-fetches stats", async () => {
    vi.mocked(adminService.getStats).mockResolvedValue(baseStats);
    render(<AdminDashboard />);

    await waitFor(() => expect(screen.getByText("Dashboard")).toBeDefined());
    expect(adminService.getStats).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => expect(adminService.getStats).toHaveBeenCalledTimes(2));
  });

  it("renders zeroed defaults when stats fields are missing/falsy", async () => {
    vi.mocked(adminService.getStats).mockResolvedValue({
      total_users: 0,
      active_users: 0,
      suspended_users: 0,
      banned_users: 0,
      admin_users: 0,
      new_users_today: 0,
      new_users_this_week: 0,
      new_users_this_month: 0,
    });
    render(<AdminDashboard />);

    await waitFor(() => expect(screen.getByText("Dashboard")).toBeDefined());
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });
});
