import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminUserDetailPage from "../../src/app/(protected)/admin/users/[id]/page";
import { adminService } from "../../src/services/adminService";

const pushMock = vi.fn();
const backMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: pushMock, back: backMock })),
  useParams: vi.fn(() => ({ id: "user-1" })),
}));

vi.mock("../../src/services/adminService", () => ({
  adminService: {
    getUser: vi.fn(),
    getActionLogs: vi.fn(),
    getUserWarnings: vi.fn(),
    suspendUser: vi.fn(),
    banUser: vi.fn(),
    restoreUser: vi.fn(),
    makeAdmin: vi.fn(),
    revokeAdmin: vi.fn(),
    issueWarning: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

const baseUser = {
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
  email_verified: "2024-01-02T00:00:00Z",
  suspension_reason: null,
  ban_reason: null,
  totp_enabled: false,
  notification_preferences: null,
  updated_at: "2024-01-01T00:00:00Z",
  profile_display_name: "Active Display",
  profile_location_city: "Austin",
  profile_location_state: "TX",
  profile_is_verified: true,
};

const emptyLogs = { items: [], total: 0, limit: 20, offset: 0 };
const emptyWarnings = {
  items: [],
  total: 0,
  active_count: 0,
  threshold: 3,
  limit: 20,
  offset: 0,
};

function mockHappyPath(overrides: Partial<typeof baseUser> = {}, warnings = emptyWarnings) {
  vi.mocked(adminService.getUser).mockResolvedValue({ ...baseUser, ...overrides });
  vi.mocked(adminService.getActionLogs).mockResolvedValue(emptyLogs);
  vi.mocked(adminService.getUserWarnings).mockResolvedValue(warnings);
}

describe("AdminUserDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows a loading spinner before data resolves", () => {
    vi.mocked(adminService.getUser).mockReturnValue(new Promise(() => {}));
    vi.mocked(adminService.getActionLogs).mockReturnValue(new Promise(() => {}));
    vi.mocked(adminService.getUserWarnings).mockReturnValue(new Promise(() => {}));
    const { container } = render(<AdminUserDetailPage />);
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("renders user details once loaded", async () => {
    mockHappyPath();
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Active User")).toBeDefined());
    expect(screen.getByText("active@example.com")).toBeDefined();
    expect(screen.getByText("Display name: Active Display")).toBeDefined();
    expect(screen.getByText("Austin, TX")).toBeDefined();
    expect(screen.getByText("Verified")).toBeDefined();
  });

  it("shows the error card with Back and Retry actions when loading fails", async () => {
    vi.mocked(adminService.getUser).mockRejectedValue(new Error("not found"));
    vi.mocked(adminService.getActionLogs).mockResolvedValue(emptyLogs);
    vi.mocked(adminService.getUserWarnings).mockResolvedValue(emptyWarnings);
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Error Loading User")).toBeDefined());
    expect(screen.getByText("not found")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(backMock).toHaveBeenCalled();

    mockHappyPath();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByText("Active User")).toBeDefined());
  });

  it("shows action buttons appropriate for an active user", async () => {
    mockHappyPath();
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Issue Warning")).toBeDefined());
    expect(screen.getByText("Suspend User")).toBeDefined();
    expect(screen.getByText("Ban User")).toBeDefined();
    expect(screen.getByText("Make Admin")).toBeDefined();
    expect(screen.queryByText("Restore User")).toBeNull();
  });

  it("shows Restore User for a banned user and hides the active-only actions", async () => {
    mockHappyPath({ banned_at: "2024-01-01T00:00:00Z", ban_reason: "TOS violation" });
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Account Banned")).toBeDefined());
    expect(screen.getByText("TOS violation")).toBeDefined();
    expect(screen.getByText("Restore User")).toBeDefined();
    expect(screen.queryByText("Suspend User")).toBeNull();
  });

  it("shows admin badge and Revoke Admin action for a superuser", async () => {
    mockHappyPath({ is_superuser: true });
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Revoke Admin")).toBeDefined());
    expect(screen.getByText("Admin")).toBeDefined();
    expect(screen.queryByText("Make Admin")).toBeNull();
  });

  it("links to the public profile with the user's id", async () => {
    mockHappyPath();
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("View Public Profile")).toBeDefined());
    const link = screen.getByText("View Public Profile").closest("a");
    expect(link?.getAttribute("href")).toBe("/profile/user-1");
  });

  it("shows an empty state for action history when there are no logs", async () => {
    mockHappyPath();
    render(<AdminUserDetailPage />);

    await waitFor(() =>
      expect(
        screen.getByText("No admin actions recorded for this user")
      ).toBeDefined()
    );
  });

  it("renders action history entries when present", async () => {
    vi.mocked(adminService.getUser).mockResolvedValue(baseUser);
    vi.mocked(adminService.getActionLogs).mockResolvedValue({
      items: [
        {
          id: "log-1",
          admin_id: "admin-1",
          admin_name: "Admin Alice",
          target_user_id: "user-1",
          target_user_name: "Active User",
          action: "SUSPEND_USER",
          reason: "Spam",
          metadata: null,
          created_at: "2024-01-05T00:00:00Z",
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
    vi.mocked(adminService.getUserWarnings).mockResolvedValue(emptyWarnings);
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("SUSPEND_USER")).toBeDefined());
    expect(screen.getByText("By: Admin Alice")).toBeDefined();
    expect(screen.getByText("Reason: Spam")).toBeDefined();
  });

  it("suspends the user via the suspend dialog", async () => {
    mockHappyPath();
    vi.mocked(adminService.suspendUser).mockResolvedValue({
      message: "ok",
      suspended_until: "2024-03-01T00:00:00Z",
    });
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Suspend User")).toBeDefined());
    fireEvent.click(screen.getByText("Suspend User"));

    await waitFor(() =>
      expect(
        screen.getByText("Temporarily restrict this user's access.")
      ).toBeDefined()
    );
    fireEvent.change(screen.getByPlaceholderText("Enter reason for this action..."), {
      target: { value: "Repeated violations" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() =>
      expect(adminService.suspendUser).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ reason: "Repeated violations" })
      )
    );
    expect(toast.success).toHaveBeenCalledWith("User suspended");
  });

  it("bans the user via the ban dialog", async () => {
    mockHappyPath();
    vi.mocked(adminService.banUser).mockResolvedValue({ message: "banned" });
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Ban User")).toBeDefined());
    fireEvent.click(screen.getByText("Ban User"));

    await waitFor(() =>
      expect(screen.getByText("Permanently ban this user.")).toBeDefined()
    );
    fireEvent.change(screen.getByPlaceholderText("Enter reason for this action..."), {
      target: { value: "Severe abuse of platform" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() =>
      expect(adminService.banUser).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ reason: "Severe abuse of platform" })
      )
    );
    expect(toast.success).toHaveBeenCalledWith("User banned");
  });

  it("restores a banned user", async () => {
    mockHappyPath({ banned_at: "2024-01-01T00:00:00Z" });
    vi.mocked(adminService.restoreUser).mockResolvedValue({ message: "restored" });
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Restore User")).toBeDefined());
    fireEvent.click(screen.getByText("Restore User"));

    await waitFor(() =>
      expect(screen.getByText("Restore this user's access.")).toBeDefined()
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() =>
      expect(adminService.restoreUser).toHaveBeenCalledWith("user-1")
    );
    expect(toast.success).toHaveBeenCalledWith("User restored");
  });

  it("grants admin privileges", async () => {
    mockHappyPath();
    vi.mocked(adminService.makeAdmin).mockResolvedValue({ message: "ok" });
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Make Admin")).toBeDefined());
    fireEvent.click(screen.getByText("Make Admin"));
    await waitFor(() =>
      expect(screen.getByText("Grant full admin privileges.")).toBeDefined()
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(adminService.makeAdmin).toHaveBeenCalledWith("user-1"));
    expect(toast.success).toHaveBeenCalledWith("Admin privileges granted");
  });

  it("revokes admin privileges", async () => {
    mockHappyPath({ is_superuser: true });
    vi.mocked(adminService.revokeAdmin).mockResolvedValue({ message: "ok" });
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Revoke Admin")).toBeDefined());
    fireEvent.click(screen.getByText("Revoke Admin"));
    await waitFor(() =>
      expect(screen.getByText("Remove admin privileges.")).toBeDefined()
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() =>
      expect(adminService.revokeAdmin).toHaveBeenCalledWith("user-1")
    );
    expect(toast.success).toHaveBeenCalledWith("Admin privileges revoked");
  });

  it("issues a non-escalating warning and shows the standard success toast", async () => {
    mockHappyPath({}, { ...emptyWarnings, active_count: 0, threshold: 3 });
    vi.mocked(adminService.issueWarning).mockResolvedValue({
      warning: {
        id: "w-1",
        user_id: "user-1",
        admin_id: "admin-1",
        admin_name: "Admin Alice",
        report_id: null,
        reason: "Rude comment",
        severity: "LOW",
        status: "ACTIVE",
        triggered_escalation: false,
        created_at: "2024-01-05T00:00:00Z",
      },
      escalated: false,
      active_count: 1,
    });
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Issue Warning")).toBeDefined());
    fireEvent.click(screen.getByText("Issue Warning"));

    await waitFor(() =>
      expect(
        screen.getByText("Notify this user of a policy violation by email.")
      ).toBeDefined()
    );
    fireEvent.change(screen.getByPlaceholderText("Enter reason for this action..."), {
      target: { value: "Being rude in comments" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send warning/i }));

    await waitFor(() =>
      expect(adminService.issueWarning).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ reason: "Being rude in comments" })
      )
    );
    expect(toast.success).toHaveBeenCalledWith(
      "Warning sent to Active User (1/3)."
    );
  });

  it("shows escalation copy and issues an escalating warning", async () => {
    // active_count + 1 >= threshold (2 + 1 >= 3) triggers the escalation UI/copy.
    mockHappyPath({}, { ...emptyWarnings, active_count: 2, threshold: 3 });
    vi.mocked(adminService.issueWarning).mockResolvedValue({
      warning: {
        id: "w-2",
        user_id: "user-1",
        admin_id: "admin-1",
        admin_name: "Admin Alice",
        report_id: null,
        reason: "Final straw",
        severity: "HIGH",
        status: "ACTIVE",
        triggered_escalation: true,
        created_at: "2024-01-06T00:00:00Z",
      },
      escalated: true,
      active_count: 3,
    });
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Issue Warning")).toBeDefined());
    fireEvent.click(screen.getByText("Issue Warning"));

    await waitFor(() =>
      expect(
        screen.getByText("This warning will trigger automatic suspension.")
      ).toBeDefined()
    );
    fireEvent.change(screen.getByPlaceholderText("Enter reason for this action..."), {
      target: { value: "This is the final warning issued" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /issue warning & suspend/i })
    );

    await waitFor(() =>
      expect(adminService.issueWarning).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ reason: "This is the final warning issued" })
      )
    );
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("automatically suspended"),
      expect.objectContaining({ duration: 8000 })
    );
  });

  it("disables the warn confirm button until the reason is at least 10 characters", async () => {
    mockHappyPath();
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Issue Warning")).toBeDefined());
    fireEvent.click(screen.getByText("Issue Warning"));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /send warning/i })).toBeDisabled()
    );

    fireEvent.change(screen.getByPlaceholderText("Enter reason for this action..."), {
      target: { value: "short" },
    });
    expect(screen.getByRole("button", { name: /send warning/i })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Enter reason for this action..."), {
      target: { value: "long enough reason" },
    });
    expect(screen.getByRole("button", { name: /send warning/i })).not.toBeDisabled();
  });

  it("shows a toast error when an action fails", async () => {
    mockHappyPath();
    vi.mocked(adminService.makeAdmin).mockRejectedValue(new Error("action failed"));
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Make Admin")).toBeDefined());
    fireEvent.click(screen.getByText("Make Admin"));
    await waitFor(() =>
      expect(screen.getByText("Grant full admin privileges.")).toBeDefined()
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("action failed"));
  });

  it("cancelling the action dialog closes it without submitting", async () => {
    mockHappyPath();
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Suspend User")).toBeDefined());
    fireEvent.click(screen.getByText("Suspend User"));
    await waitFor(() =>
      expect(
        screen.getByText("Temporarily restrict this user's access.")
      ).toBeDefined()
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(
      screen.queryByText("Temporarily restrict this user's access.")
    ).toBeNull();
    expect(adminService.suspendUser).not.toHaveBeenCalled();
  });

  it("clicking Refresh re-fetches user data", async () => {
    mockHappyPath();
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(adminService.getUser).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => expect(adminService.getUser).toHaveBeenCalledTimes(2));
  });

  it("the back arrow button in the header navigates back", async () => {
    mockHappyPath();
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("User Details")).toBeDefined());
    const backButtons = screen.getAllByRole("button");
    const backArrowButton = backButtons.find((b) =>
      b.querySelector("svg.lucide-arrow-left")
    )!;
    fireEvent.click(backArrowButton);

    expect(backMock).toHaveBeenCalled();
  });

  it("falls back to '?' and 'Never' when the user has no name or last login", async () => {
    mockHappyPath({ name: null, last_login_at: null });
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Unknown")).toBeDefined());
    expect(screen.getAllByText("Never").length).toBeGreaterThan(0);
  });

  it("shows Inactive status for a disabled account with no ban/suspension", async () => {
    mockHappyPath({ is_active: false });
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Inactive")).toBeDefined());
  });

  it("treats an expired suspension as not-suspended", async () => {
    const past = new Date(Date.now() - 100000).toISOString();
    mockHappyPath({
      suspended_at: "2024-01-01T00:00:00Z",
      suspended_until: past,
    });
    render(<AdminUserDetailPage />);

    await waitFor(() => expect(screen.getByText("Active User")).toBeDefined());
    expect(screen.getByText("Active")).toBeDefined();
    expect(screen.queryByText("Suspended")).toBeNull();
  });
});
