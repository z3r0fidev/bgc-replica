import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SessionsPage from "../../src/app/(protected)/settings/sessions/page";
import { sessionService } from "../../src/services/sessionService";
import type { Session } from "../../src/types/session";

vi.mock("../../src/services/sessionService", () => ({
  sessionService: {
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllSessions: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "session-1",
    device_info: {
      browser: "Chrome",
      browser_version: "120",
      os: "macOS",
      os_version: "14",
      device_type: "desktop",
    },
    ip_address: "1.2.3.4",
    last_active: new Date().toISOString(),
    created_at: new Date().toISOString(),
    expires: new Date().toISOString(),
    is_current: false,
    ...overrides,
  };
}

describe("SessionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading spinner initially", () => {
    vi.mocked(sessionService.listSessions).mockReturnValue(new Promise(() => {}));
    const { container } = render(<SessionsPage />);
    expect(container.querySelector("svg.animate-spin")).not.toBeNull();
  });

  it("shows an error toast when the fetch fails", async () => {
    vi.mocked(sessionService.listSessions).mockRejectedValue(new Error("nope"));
    render(<SessionsPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load sessions");
    });
  });

  it("renders the current session with device info and 'This device' badge", async () => {
    vi.mocked(sessionService.listSessions).mockResolvedValue({
      sessions: [makeSession({ id: "current", is_current: true })],
      total: 1,
    });
    render(<SessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Current Session")).toBeDefined();
    });
    expect(screen.getByText("This device")).toBeDefined();
    expect(screen.getByText("Chrome 120 on macOS 14")).toBeDefined();
    expect(screen.getByText("1.2.3.4")).toBeDefined();
    expect(screen.getByText("No other active sessions")).toBeDefined();
  });

  it("shows 'Unknown device' when device_info is missing", async () => {
    vi.mocked(sessionService.listSessions).mockResolvedValue({
      sessions: [makeSession({ id: "current", is_current: true, device_info: null })],
      total: 1,
    });
    render(<SessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Unknown device")).toBeDefined();
    });
  });

  it("lists other sessions and allows revoking one", async () => {
    vi.mocked(sessionService.listSessions).mockResolvedValue({
      sessions: [
        makeSession({ id: "current", is_current: true }),
        makeSession({ id: "other-1", is_current: false, ip_address: "9.9.9.9" }),
      ],
      total: 2,
    });
    vi.mocked(sessionService.revokeSession).mockResolvedValue({
      success: true,
      message: "Revoked",
      revoked_count: 1,
    });
    render(<SessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Other Sessions (1)")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /^sign out$/i }));

    await waitFor(() => {
      expect(sessionService.revokeSession).toHaveBeenCalledWith("other-1");
      expect(toast.success).toHaveBeenCalledWith("Session revoked");
    });
    expect(screen.getByText("No other active sessions")).toBeDefined();
  });

  it("shows an error toast when revoking a single session fails", async () => {
    vi.mocked(sessionService.listSessions).mockResolvedValue({
      sessions: [makeSession({ id: "other-1", is_current: false })],
      total: 1,
    });
    vi.mocked(sessionService.revokeSession).mockRejectedValue(new Error("revoke failed"));
    render(<SessionsPage />);

    await waitFor(() => screen.getByRole("button", { name: /^sign out$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^sign out$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("revoke failed");
    });
  });

  it("revokes all other sessions via the confirmation dialog, keeping the current one", async () => {
    vi.mocked(sessionService.listSessions).mockResolvedValue({
      sessions: [
        makeSession({ id: "current", is_current: true }),
        makeSession({ id: "other-1", is_current: false }),
      ],
      total: 2,
    });
    vi.mocked(sessionService.revokeAllSessions).mockResolvedValue({
      success: true,
      message: "All other sessions revoked",
      revoked_count: 1,
    });
    render(<SessionsPage />);

    await waitFor(() => screen.getByRole("button", { name: /sign out all/i }));
    fireEvent.click(screen.getByRole("button", { name: /sign out all/i }));

    const confirmButton = await screen.findAllByRole("button", { name: /sign out all/i });
    fireEvent.click(confirmButton[confirmButton.length - 1]);

    await waitFor(() => {
      expect(sessionService.revokeAllSessions).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("All other sessions revoked");
    });
    expect(screen.getByText("No other active sessions")).toBeDefined();
  });

  it("shows an error toast when revoking all sessions fails", async () => {
    vi.mocked(sessionService.listSessions).mockResolvedValue({
      sessions: [makeSession({ id: "other-1", is_current: false })],
      total: 1,
    });
    vi.mocked(sessionService.revokeAllSessions).mockRejectedValue(
      new Error("revoke all failed")
    );
    render(<SessionsPage />);

    await waitFor(() => screen.getByRole("button", { name: /sign out all/i }));
    fireEvent.click(screen.getByRole("button", { name: /sign out all/i }));

    const confirmButton = await screen.findAllByRole("button", { name: /sign out all/i });
    fireEvent.click(confirmButton[confirmButton.length - 1]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("revoke all failed");
    });
  });

  it("refetches sessions when clicking the refresh button", async () => {
    vi.mocked(sessionService.listSessions).mockResolvedValue({ sessions: [], total: 0 });
    render(<SessionsPage />);

    await waitFor(() => expect(sessionService.listSessions).toHaveBeenCalledTimes(1));

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    await waitFor(() => expect(sessionService.listSessions).toHaveBeenCalledTimes(2));
  });

  it("formats relative time buckets (minutes/hours/days/never/older)", async () => {
    const now = new Date();
    const minutesAgo = new Date(now.getTime() - 5 * 60000).toISOString();
    const hoursAgo = new Date(now.getTime() - 3 * 3600000).toISOString();
    const daysAgo = new Date(now.getTime() - 2 * 86400000).toISOString();
    const lastYear = new Date(now.getFullYear() - 1, 0, 1).toISOString();
    vi.mocked(sessionService.listSessions).mockResolvedValue({
      sessions: [
        makeSession({ id: "current", is_current: true, last_active: minutesAgo }),
        makeSession({ id: "other-hours", is_current: false, last_active: hoursAgo }),
        makeSession({ id: "other-days", is_current: false, last_active: daysAgo }),
        makeSession({ id: "other-never", is_current: false, last_active: null }),
        makeSession({ id: "other-old", is_current: false, last_active: lastYear }),
      ],
      total: 5,
    });
    render(<SessionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/5 minutes ago/)).toBeDefined();
    });
    expect(screen.getByText(/3 hours ago/)).toBeDefined();
    expect(screen.getByText(/2 days ago/)).toBeDefined();
    expect(screen.getByText("Never")).toBeDefined();
    // Older-than-a-year sessions render a full localized date instead of a relative bucket.
    expect(
      screen.getByText(new RegExp(String(now.getFullYear() - 1)))
    ).toBeDefined();
  });

  it("renders mobile and tablet device icons for other sessions", async () => {
    vi.mocked(sessionService.listSessions).mockResolvedValue({
      sessions: [
        makeSession({
          id: "mobile-1",
          is_current: false,
          device_info: {
            browser: "Safari",
            browser_version: null,
            os: "iOS",
            os_version: null,
            device_type: "mobile",
          },
        }),
        makeSession({
          id: "tablet-1",
          is_current: false,
          device_info: {
            browser: null,
            browser_version: null,
            os: null,
            os_version: null,
            device_type: "tablet",
          },
        }),
      ],
      total: 2,
    });
    render(<SessionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Safari on iOS")).toBeDefined();
    });
    // A device_info with no browser/os falls back to "Unknown device".
    expect(screen.getByText("Unknown device")).toBeDefined();
    expect(document.querySelector("svg.lucide-smartphone")).not.toBeNull();
    expect(document.querySelector("svg.lucide-tablet")).not.toBeNull();
  });
});
