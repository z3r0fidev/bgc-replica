import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminLogsPage from "../../src/app/(protected)/admin/logs/page";
import { adminService } from "../../src/services/adminService";

vi.mock("../../src/services/adminService", () => ({
  adminService: {
    getActionLogs: vi.fn(),
  },
}));

function makeLog(overrides: Partial<{
  id: string;
  admin_id: string | null;
  admin_name: string | null;
  target_user_id: string | null;
  target_user_name: string | null;
  action: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}> = {}) {
  return {
    id: "log-1",
    admin_id: "admin-1",
    admin_name: "Admin Alice",
    target_user_id: "user-1",
    target_user_name: "Targeted Person",
    action: "SUSPEND_USER",
    reason: "Spamming",
    metadata: null,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("AdminLogsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows a loading spinner in the table while fetching", () => {
    vi.mocked(adminService.getActionLogs).mockReturnValue(new Promise(() => {}));
    const { container } = render(<AdminLogsPage />);
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("shows an empty state when there are no logs", async () => {
    vi.mocked(adminService.getActionLogs).mockResolvedValue({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });
    render(<AdminLogsPage />);

    await waitFor(() => expect(screen.getByText("No action logs found")).toBeDefined());
  });

  it("renders a row per log with formatted action, admin, target and reason", async () => {
    vi.mocked(adminService.getActionLogs).mockResolvedValue({
      items: [makeLog()],
      total: 1,
      limit: 50,
      offset: 0,
    });
    render(<AdminLogsPage />);

    await waitFor(() => expect(screen.getByText("Suspend User")).toBeDefined());
    expect(screen.getByText("Admin Alice")).toBeDefined();
    expect(screen.getByText("Targeted Person")).toBeDefined();
    expect(screen.getByText("Spamming")).toBeDefined();
  });

  it("falls back to 'System' and em-dash when admin/target/reason are null", async () => {
    vi.mocked(adminService.getActionLogs).mockResolvedValue({
      items: [
        makeLog({
          admin_name: null,
          target_user_name: null,
          reason: null,
          action: "UNKNOWN_ACTION",
        }),
      ],
      total: 1,
      limit: 50,
      offset: 0,
    });
    render(<AdminLogsPage />);

    await waitFor(() => expect(screen.getByText("System")).toBeDefined());
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("shows an error card with retry on failure", async () => {
    vi.mocked(adminService.getActionLogs).mockRejectedValue(new Error("logs down"));
    render(<AdminLogsPage />);

    await waitFor(() => expect(screen.getByText("Error Loading Logs")).toBeDefined());
    expect(screen.getByText("logs down")).toBeDefined();

    vi.mocked(adminService.getActionLogs).mockResolvedValue({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByText("No action logs found")).toBeDefined());
  });

  it("clicking Refresh re-fetches logs", async () => {
    vi.mocked(adminService.getActionLogs).mockResolvedValue({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });
    render(<AdminLogsPage />);

    await waitFor(() => expect(adminService.getActionLogs).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => expect(adminService.getActionLogs).toHaveBeenCalledTimes(2));
  });

  it("changing the action filter resets to page 0 and includes the action param", async () => {
    vi.mocked(adminService.getActionLogs).mockResolvedValue({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });
    render(<AdminLogsPage />);

    await waitFor(() => expect(adminService.getActionLogs).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("combobox"));
    await waitFor(() => expect(screen.getByText("Ban User")).toBeDefined());
    fireEvent.click(screen.getByText("Ban User"));

    await waitFor(() =>
      expect(adminService.getActionLogs).toHaveBeenCalledWith(
        expect.objectContaining({ action: "BAN_USER", offset: 0 })
      )
    );
  });

  it("renders pagination controls and pages forward/back within bounds", async () => {
    vi.mocked(adminService.getActionLogs).mockResolvedValue({
      items: [makeLog()],
      total: 120,
      limit: 50,
      offset: 0,
    });
    render(<AdminLogsPage />);

    await waitFor(() => expect(screen.getByText("Page 1 of 3")).toBeDefined());
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /^next/i }));

    await waitFor(() =>
      expect(adminService.getActionLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 50 })
      )
    );
  });

  it("uses a fallback badge color for an unmapped action", async () => {
    vi.mocked(adminService.getActionLogs).mockResolvedValue({
      items: [makeLog({ action: "SOMETHING_ELSE" })],
      total: 1,
      limit: 50,
      offset: 0,
    });
    render(<AdminLogsPage />);

    await waitFor(() => expect(screen.getByText("Something Else")).toBeDefined());
    expect(screen.getByText("Something Else").className).toContain("bg-gray-100");
  });

  it("paging forward then backward returns to offset 0", async () => {
    vi.mocked(adminService.getActionLogs).mockResolvedValue({
      items: [makeLog()],
      total: 120,
      limit: 50,
      offset: 0,
    });
    render(<AdminLogsPage />);

    await waitFor(() => expect(screen.getByText("Page 1 of 3")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /^next/i }));
    await waitFor(() => expect(screen.getByText("Page 2 of 3")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /previous/i }));

    await waitFor(() =>
      expect(adminService.getActionLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 0 })
      )
    );
  });
});
