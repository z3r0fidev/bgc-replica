import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ModerationPage from "../../src/app/(protected)/admin/moderation/page";
import { moderationService } from "../../src/services/moderationService";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: pushMock })),
}));

vi.mock("../../src/services/moderationService", () => ({
  moderationService: {
    getQueue: vi.fn(),
    getStats: vi.fn(),
    resolveReport: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

const baseStats = {
  pending_count: 3,
  resolved_today: 1,
  total_reports: 10,
  reports_by_type: { USER: 2, POST: 1 },
  reports_by_reason: {},
};

const userReport = {
  id: "report-1",
  reporter: { id: "r-1", name: "Reporter One", email: "r1@example.com", image: null },
  content_type: "USER" as const,
  content_id: "user-1",
  reason: "HARASSMENT: being mean",
  status: "PENDING" as const,
  created_at: "2024-01-01T00:00:00Z",
  reviewed_by: null,
  reported_user: {
    id: "user-1",
    name: "Reported User",
    email: "reported@example.com",
    image: null,
  },
  content_preview: null,
};

const threadReport = {
  ...userReport,
  id: "report-2",
  content_type: "THREAD" as const,
  reported_user: null,
  content_preview: "some spam text",
  reason: "SPAM: buy now",
};

describe("ModerationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows a loading spinner before data resolves", () => {
    vi.mocked(moderationService.getQueue).mockReturnValue(new Promise(() => {}));
    vi.mocked(moderationService.getStats).mockReturnValue(new Promise(() => {}));
    const { container } = render(<ModerationPage />);
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("renders stats cards and reports once loaded", async () => {
    vi.mocked(moderationService.getQueue).mockResolvedValue([userReport]);
    vi.mocked(moderationService.getStats).mockResolvedValue(baseStats);
    render(<ModerationPage />);

    await waitFor(() => expect(screen.getByText("Moderation Queue")).toBeDefined());
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("Reported User")).toBeDefined();
    expect(screen.getByText("USER: 2")).toBeDefined();
    expect(screen.getByText("POST: 1")).toBeDefined();
  });

  it("shows 'None' for reports-by-type when empty", async () => {
    vi.mocked(moderationService.getQueue).mockResolvedValue([]);
    vi.mocked(moderationService.getStats).mockResolvedValue({
      ...baseStats,
      reports_by_type: {},
    });
    render(<ModerationPage />);

    await waitFor(() => expect(screen.getByText("None")).toBeDefined());
  });

  it("shows the All Clear empty state when there are no reports", async () => {
    vi.mocked(moderationService.getQueue).mockResolvedValue([]);
    vi.mocked(moderationService.getStats).mockResolvedValue(baseStats);
    render(<ModerationPage />);

    await waitFor(() => expect(screen.getByText("All Clear!")).toBeDefined());
  });

  it("redirects to / with a toast when access is denied", async () => {
    vi.mocked(moderationService.getQueue).mockRejectedValue(
      new Error("Admin access required")
    );
    vi.mocked(moderationService.getStats).mockResolvedValue(baseStats);
    render(<ModerationPage />);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    expect(toast.error).toHaveBeenCalledWith(
      "You don't have permission to access this page"
    );
  });

  it("shows a generic error card with retry for other failures", async () => {
    vi.mocked(moderationService.getQueue).mockRejectedValue(new Error("queue down"));
    vi.mocked(moderationService.getStats).mockResolvedValue(baseStats);
    render(<ModerationPage />);

    await waitFor(() =>
      expect(screen.getByText("Error Loading Moderation Queue")).toBeDefined()
    );
    expect(screen.getByText("queue down")).toBeDefined();

    vi.mocked(moderationService.getQueue).mockResolvedValue([]);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByText("All Clear!")).toBeDefined());
  });

  it("opens the action dialog on Review and dismisses a report", async () => {
    vi.mocked(moderationService.getQueue).mockResolvedValue([userReport]);
    vi.mocked(moderationService.getStats).mockResolvedValue(baseStats);
    vi.mocked(moderationService.resolveReport).mockResolvedValue({
      status: "ok",
      report_id: "report-1",
      action: "dismiss",
      new_status: "DISMISSED",
    });
    render(<ModerationPage />);

    await waitFor(() => expect(screen.getByText("Reported User")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /review/i }));

    await waitFor(() =>
      expect(screen.getByText("Take Action on Report")).toBeDefined()
    );
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    await waitFor(() =>
      expect(moderationService.resolveReport).toHaveBeenCalledWith(
        "report-1",
        "dismiss"
      )
    );
    expect(toast.success).toHaveBeenCalledWith("Report dismissed");
  });

  it("issues a warning with a special success toast", async () => {
    vi.mocked(moderationService.getQueue).mockResolvedValue([userReport]);
    vi.mocked(moderationService.getStats).mockResolvedValue(baseStats);
    vi.mocked(moderationService.resolveReport).mockResolvedValue({
      status: "ok",
      report_id: "report-1",
      action: "warn_user",
      new_status: "RESOLVED",
    });
    render(<ModerationPage />);

    await waitFor(() => expect(screen.getByText("Reported User")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /review/i }));
    await waitFor(() => expect(screen.getByText("Take Action on Report")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /warn user/i }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Warning issued and emailed to user"
      )
    );
  });

  it("shows Delete Content (not user actions) for non-USER report types", async () => {
    vi.mocked(moderationService.getQueue).mockResolvedValue([threadReport]);
    vi.mocked(moderationService.getStats).mockResolvedValue(baseStats);
    vi.mocked(moderationService.resolveReport).mockResolvedValue({
      status: "ok",
      report_id: "report-2",
      action: "delete_content",
      new_status: "RESOLVED",
    });
    render(<ModerationPage />);

    await waitFor(() =>
      expect(screen.getByText(/some spam text/)).toBeDefined()
    );
    fireEvent.click(screen.getByRole("button", { name: /review/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /delete content/i })).toBeDefined()
    );
    expect(screen.queryByRole("button", { name: /ban user/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /delete content/i }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Report resolved")
    );
  });

  it("bans a user directly from the action dialog", async () => {
    vi.mocked(moderationService.getQueue).mockResolvedValue([userReport]);
    vi.mocked(moderationService.getStats).mockResolvedValue(baseStats);
    vi.mocked(moderationService.resolveReport).mockResolvedValue({
      status: "ok",
      report_id: "report-1",
      action: "ban_user",
      new_status: "RESOLVED",
    });
    render(<ModerationPage />);

    await waitFor(() => expect(screen.getByText("Reported User")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /review/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /ban user/i })).toBeDefined()
    );

    fireEvent.click(screen.getByRole("button", { name: /ban user/i }));

    await waitFor(() =>
      expect(moderationService.resolveReport).toHaveBeenCalledWith(
        "report-1",
        "ban_user"
      )
    );
  });

  it("falls back to '?' initials when reporter/reported user names are null", async () => {
    vi.mocked(moderationService.getQueue).mockResolvedValue([
      {
        ...userReport,
        reporter: { ...userReport.reporter, name: null },
        reported_user: { ...userReport.reported_user!, name: null },
      },
    ]);
    vi.mocked(moderationService.getStats).mockResolvedValue(baseStats);
    render(<ModerationPage />);

    await waitFor(() => expect(screen.getByText("Unknown User")).toBeDefined());
    expect(screen.getAllByText("?").length).toBeGreaterThan(0);
  });

  it("shows a toast error when resolving a report fails", async () => {
    vi.mocked(moderationService.getQueue).mockResolvedValue([userReport]);
    vi.mocked(moderationService.getStats).mockResolvedValue(baseStats);
    vi.mocked(moderationService.resolveReport).mockRejectedValue(
      new Error("resolve failed")
    );
    render(<ModerationPage />);

    await waitFor(() => expect(screen.getByText("Reported User")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /review/i }));
    await waitFor(() => expect(screen.getByText("Take Action on Report")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("resolve failed"));
  });

  it("cancelling the action dialog closes it without resolving", async () => {
    vi.mocked(moderationService.getQueue).mockResolvedValue([userReport]);
    vi.mocked(moderationService.getStats).mockResolvedValue(baseStats);
    render(<ModerationPage />);

    await waitFor(() => expect(screen.getByText("Reported User")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /review/i }));
    await waitFor(() => expect(screen.getByText("Take Action on Report")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByText("Take Action on Report")).toBeNull();
    expect(moderationService.resolveReport).not.toHaveBeenCalled();
  });

  it("changing status/type filters re-fetches the queue with new params", async () => {
    vi.mocked(moderationService.getQueue).mockResolvedValue([]);
    vi.mocked(moderationService.getStats).mockResolvedValue(baseStats);
    render(<ModerationPage />);

    await waitFor(() => expect(moderationService.getQueue).toHaveBeenCalledTimes(1));

    const combos = screen.getAllByRole("combobox");
    fireEvent.click(combos[0]);
    await waitFor(() => expect(screen.getByText("Resolved")).toBeDefined());
    fireEvent.click(screen.getByText("Resolved"));

    await waitFor(() =>
      expect(moderationService.getQueue).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "RESOLVED" })
      )
    );
  });
});
