import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminUsersPage from "../../src/app/(protected)/admin/users/page";
import { adminService } from "../../src/services/adminService";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: pushMock })),
}));

vi.mock("../../src/services/adminService", () => ({
  adminService: {
    getUsers: vi.fn(),
    suspendUser: vi.fn(),
    banUser: vi.fn(),
    restoreUser: vi.fn(),
    makeAdmin: vi.fn(),
    revokeAdmin: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

function makeUser(overrides: Partial<{
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  is_active: boolean;
  is_superuser: boolean;
  suspended_at: string | null;
  suspended_until: string | null;
  banned_at: string | null;
  created_at: string;
  last_login_at: string | null;
}> = {}) {
  return {
    id: "user-1",
    name: "Active User",
    email: "active@example.com",
    image: null,
    is_active: true,
    is_superuser: false,
    suspended_at: null,
    suspended_until: null,
    banned_at: null,
    created_at: "2024-01-01T00:00:00Z",
    last_login_at: "2024-02-01T00:00:00Z",
    ...overrides,
  };
}

describe("AdminUsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows a loading spinner in the table while fetching", () => {
    vi.mocked(adminService.getUsers).mockReturnValue(new Promise(() => {}));
    const { container } = render(<AdminUsersPage />);
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("shows an empty state when there are no users", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
    render(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("No users found")).toBeDefined());
  });

  it("renders user rows with active status and role badges", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [makeUser(), makeUser({ id: "admin-1", name: "Admin Bob", is_superuser: true })],
      total: 2,
      limit: 20,
      offset: 0,
    });
    render(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Active User")).toBeDefined());
    expect(screen.getByText("Admin Bob")).toBeDefined();
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getByText("Admin")).toBeDefined();
  });

  it("renders suspended and banned status badges correctly", async () => {
    const future = new Date(Date.now() + 100000).toISOString();
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [
        makeUser({
          id: "susp-1",
          name: "Suspended User",
          suspended_at: "2024-01-01T00:00:00Z",
          suspended_until: future,
        }),
        makeUser({ id: "ban-1", name: "Banned User", banned_at: "2024-01-01T00:00:00Z" }),
        makeUser({ id: "inactive-1", name: "Inactive User", is_active: false }),
      ],
      total: 3,
      limit: 20,
      offset: 0,
    });
    render(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Suspended User")).toBeDefined());
    expect(screen.getByText("Suspended")).toBeDefined();
    expect(screen.getByText("Banned")).toBeDefined();
    expect(screen.getByText("Inactive")).toBeDefined();
  });

  it("navigates to the user detail page when the view (eye) button is clicked", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [makeUser()],
      total: 1,
      limit: 20,
      offset: 0,
    });
    render(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Active User")).toBeDefined());
    fireEvent.click(screen.getByTitle("View details"));

    expect(pushMock).toHaveBeenCalledWith("/admin/users/user-1");
  });

  it("submitting the search form resets to page 0 and re-fetches with the query", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
    render(<AdminUsersPage />);

    await waitFor(() => expect(adminService.getUsers).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText("Search by name or email..."), {
      target: { value: "jane" },
    });
    fireEvent.submit(
      screen.getByPlaceholderText("Search by name or email...").closest("form")!
    );

    await waitFor(() =>
      expect(adminService.getUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: "jane", offset: 0 })
      )
    );
  });

  it("shows an error card with retry when loading fails", async () => {
    vi.mocked(adminService.getUsers).mockRejectedValue(new Error("users down"));
    render(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Error Loading Users")).toBeDefined());
    expect(screen.getByText("users down")).toBeDefined();

    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByText("No users found")).toBeDefined());
  });

  it("opens the suspend dialog, requires a reason, and submits", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [makeUser()],
      total: 1,
      limit: 20,
      offset: 0,
    });
    vi.mocked(adminService.suspendUser).mockResolvedValue({
      message: "ok",
      suspended_until: "2024-02-02T00:00:00Z",
    });
    render(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Active User")).toBeDefined());
    fireEvent.click(screen.getByTitle("Suspend"));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Suspend User" })).toBeDefined()
    );
    const confirmButton = screen.getByRole("button", { name: "Suspend User" });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Enter reason for this action..."), {
      target: { value: "Repeated spam violations" },
    });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await waitFor(() =>
      expect(adminService.suspendUser).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ reason: "Repeated spam violations" })
      )
    );
    expect(toast.success).toHaveBeenCalledWith("User suspended");
  });

  it("bans a user via the ban dialog", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [makeUser()],
      total: 1,
      limit: 20,
      offset: 0,
    });
    vi.mocked(adminService.banUser).mockResolvedValue({ message: "banned" });
    render(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Active User")).toBeDefined());
    fireEvent.click(screen.getByTitle("Ban"));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Ban User" })).toBeDefined()
    );
    fireEvent.change(screen.getByPlaceholderText("Enter reason for this action..."), {
      target: { value: "Severe policy violation" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ban User" }));

    await waitFor(() =>
      expect(adminService.banUser).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ reason: "Severe policy violation" })
      )
    );
    expect(toast.success).toHaveBeenCalledWith("User banned");
  });

  it("restores a suspended user without requiring a reason", async () => {
    const future = new Date(Date.now() + 100000).toISOString();
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [
        makeUser({ suspended_at: "2024-01-01T00:00:00Z", suspended_until: future }),
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
    vi.mocked(adminService.restoreUser).mockResolvedValue({ message: "restored" });
    render(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Active User")).toBeDefined());
    fireEvent.click(screen.getByTitle("Restore"));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Restore User" })).toBeDefined()
    );
    fireEvent.click(screen.getByRole("button", { name: "Restore User" }));

    await waitFor(() => expect(adminService.restoreUser).toHaveBeenCalledWith("user-1"));
    expect(toast.success).toHaveBeenCalledWith("User restored");
  });

  it("grants admin privileges via make-admin action", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [makeUser()],
      total: 1,
      limit: 20,
      offset: 0,
    });
    vi.mocked(adminService.makeAdmin).mockResolvedValue({ message: "ok" });
    render(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Active User")).toBeDefined());
    fireEvent.click(screen.getByTitle("Make admin"));

    await waitFor(() => expect(screen.getByText("Grant Admin Privileges")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Grant Admin" }));

    await waitFor(() => expect(adminService.makeAdmin).toHaveBeenCalledWith("user-1"));
    expect(toast.success).toHaveBeenCalledWith("Admin privileges granted");
  });

  it("revokes admin privileges via revoke-admin action", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [makeUser({ is_superuser: true })],
      total: 1,
      limit: 20,
      offset: 0,
    });
    vi.mocked(adminService.revokeAdmin).mockResolvedValue({ message: "ok" });
    render(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Active User")).toBeDefined());
    fireEvent.click(screen.getByTitle("Revoke admin"));

    await waitFor(() => expect(screen.getByText("Revoke Admin Privileges")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Revoke Admin" }));

    await waitFor(() => expect(adminService.revokeAdmin).toHaveBeenCalledWith("user-1"));
    expect(toast.success).toHaveBeenCalledWith("Admin privileges revoked");
  });

  it("shows a toast error when an action fails", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [makeUser()],
      total: 1,
      limit: 20,
      offset: 0,
    });
    vi.mocked(adminService.makeAdmin).mockRejectedValue(new Error("action failed"));
    render(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Active User")).toBeDefined());
    fireEvent.click(screen.getByTitle("Make admin"));
    await waitFor(() => expect(screen.getByText("Grant Admin Privileges")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Grant Admin" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("action failed"));
  });

  it("cancelling the action dialog closes it without submitting", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [makeUser()],
      total: 1,
      limit: 20,
      offset: 0,
    });
    render(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Active User")).toBeDefined());
    fireEvent.click(screen.getByTitle("Suspend"));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Suspend User" })).toBeDefined()
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByText("Temporarily restrict this user's access to the platform.")).toBeNull();
    expect(adminService.suspendUser).not.toHaveBeenCalled();
  });

  it("renders pagination controls and pages forward", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [makeUser()],
      total: 45,
      limit: 20,
      offset: 0,
    });
    render(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Page 1 of 3")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /^next/i }));

    await waitFor(() =>
      expect(adminService.getUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 20 })
      )
    );
  });

  it("toggling sort order flips between ascending and descending", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
    render(<AdminUsersPage />);

    await waitFor(() => expect(adminService.getUsers).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText("↓"));

    await waitFor(() =>
      expect(adminService.getUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort_order: "asc" })
      )
    );
    expect(screen.getByText("↑")).toBeDefined();
  });

  it("clicking Refresh re-fetches users", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
    render(<AdminUsersPage />);

    await waitFor(() => expect(adminService.getUsers).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => expect(adminService.getUsers).toHaveBeenCalledTimes(2));
  });

  it("changing the status filter to 'active' includes is_active/is_banned/is_suspended params", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
    render(<AdminUsersPage />);

    await waitFor(() => expect(adminService.getUsers).toHaveBeenCalledTimes(1));

    const combos = screen.getAllByRole("combobox");
    fireEvent.click(combos[0]);
    fireEvent.click(await screen.findByRole("option", { name: "Active" }));

    await waitFor(() =>
      expect(adminService.getUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({
          is_active: true,
          is_banned: false,
          is_suspended: false,
        })
      )
    );
  });

  it("changing the role filter to Admin/User includes the is_superuser param", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
    render(<AdminUsersPage />);

    await waitFor(() => expect(adminService.getUsers).toHaveBeenCalledTimes(1));

    const combos = screen.getAllByRole("combobox");
    fireEvent.click(combos[1]);
    fireEvent.click(await screen.findByRole("option", { name: "Admin" }));

    await waitFor(() =>
      expect(adminService.getUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ is_superuser: true })
      )
    );
  });

  it("falls back to '?' and 'Never' when a user has no name or last login", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [makeUser({ name: null, last_login_at: null })],
      total: 1,
      limit: 20,
      offset: 0,
    });
    render(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Never")).toBeDefined());
  });

  it("paging forward then backward returns to offset 0", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      items: [makeUser()],
      total: 45,
      limit: 20,
      offset: 0,
    });
    render(<AdminUsersPage />);

    await waitFor(() => expect(screen.getByText("Page 1 of 3")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /^next/i }));
    await waitFor(() => expect(screen.getByText("Page 2 of 3")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /previous/i }));

    await waitFor(() =>
      expect(adminService.getUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 0 })
      )
    );
  });
});
