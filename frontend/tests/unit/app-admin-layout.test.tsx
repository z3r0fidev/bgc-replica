import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AdminLayout from "../../src/app/(protected)/admin/layout";
import { adminService } from "../../src/services/adminService";

const pushMock = vi.fn();
let pathname = "/admin";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: pushMock })),
  usePathname: vi.fn(() => pathname),
}));

vi.mock("../../src/services/adminService", () => ({
  adminService: {
    getStats: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { toast } from "sonner";

describe("AdminLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathname = "/admin";
  });

  it("shows a loading spinner before the access probe resolves", () => {
    vi.mocked(adminService.getStats).mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <AdminLayout>
        <div>page content</div>
      </AdminLayout>
    );

    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(screen.queryByText("page content")).toBeNull();
  });

  it("renders children and sidebar nav once getStats succeeds", async () => {
    vi.mocked(adminService.getStats).mockResolvedValue({
      total_users: 1,
      active_users: 1,
      suspended_users: 0,
      banned_users: 0,
      admin_users: 1,
      new_users_today: 0,
      new_users_this_week: 0,
      new_users_this_month: 0,
    });

    render(
      <AdminLayout>
        <div>page content</div>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(screen.getByText("page content")).toBeDefined();
    });
    expect(screen.getByText("Admin Panel")).toBeDefined();
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Users")).toBeDefined();
    expect(screen.getByText("Moderation")).toBeDefined();
    expect(screen.getByText("Analytics")).toBeDefined();
    expect(screen.getByText("System Health")).toBeDefined();
    expect(screen.getByText("Action Logs")).toBeDefined();
  });

  it("redirects to / with a toast on a 403 (Admin access required) response", async () => {
    vi.mocked(adminService.getStats).mockRejectedValue(
      new Error("Admin access required")
    );

    render(
      <AdminLayout>
        <div>page content</div>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "You don't have permission to access the admin area"
      );
    });
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("redirects to / with a toast when the error message includes 403", async () => {
    vi.mocked(adminService.getStats).mockRejectedValue(new Error("HTTP 403"));

    render(
      <AdminLayout>
        <div>page content</div>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
    expect(toast.error).toHaveBeenCalled();
  });

  it("redirects to /login on a 401 response without a toast", async () => {
    vi.mocked(adminService.getStats).mockRejectedValue(new Error("HTTP 401"));

    render(
      <AdminLayout>
        <div>page content</div>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("fails open (still shows content) for any other error", async () => {
    vi.mocked(adminService.getStats).mockRejectedValue(new Error("network error"));

    render(
      <AdminLayout>
        <div>page content</div>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(screen.getByText("page content")).toBeDefined();
    });
    expect(pushMock).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("fails open when the thrown error is not an Error instance", async () => {
    vi.mocked(adminService.getStats).mockRejectedValue("some string rejection");

    render(
      <AdminLayout>
        <div>page content</div>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(screen.getByText("page content")).toBeDefined();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("highlights the exact-match nav item as active and does not also mark unrelated items active", async () => {
    pathname = "/admin";
    vi.mocked(adminService.getStats).mockResolvedValue({
      total_users: 1,
      active_users: 1,
      suspended_users: 0,
      banned_users: 0,
      admin_users: 1,
      new_users_today: 0,
      new_users_this_week: 0,
      new_users_this_month: 0,
    });

    render(
      <AdminLayout>
        <div>page content</div>
      </AdminLayout>
    );

    await waitFor(() => expect(screen.getByText("page content")).toBeDefined());

    const dashboardLink = screen.getByText("Dashboard").closest("a")!;
    const usersLink = screen.getByText("Users").closest("a")!;
    expect(dashboardLink.className).toContain("bg-primary");
    expect(usersLink.className).not.toContain("bg-primary");
  });

  it("highlights a nested route's nav item via startsWith (e.g. /admin/users/123 highlights Users)", async () => {
    pathname = "/admin/users/123";
    vi.mocked(adminService.getStats).mockResolvedValue({
      total_users: 1,
      active_users: 1,
      suspended_users: 0,
      banned_users: 0,
      admin_users: 1,
      new_users_today: 0,
      new_users_this_week: 0,
      new_users_this_month: 0,
    });

    render(
      <AdminLayout>
        <div>page content</div>
      </AdminLayout>
    );

    await waitFor(() => expect(screen.getByText("page content")).toBeDefined());

    const usersLink = screen.getByText("Users").closest("a")!;
    const dashboardLink = screen.getByText("Dashboard").closest("a")!;
    expect(usersLink.className).toContain("bg-primary");
    // "/admin/users/123" must not also highlight the exact "/admin" Dashboard item.
    expect(dashboardLink.className).not.toContain("bg-primary");
  });
});
