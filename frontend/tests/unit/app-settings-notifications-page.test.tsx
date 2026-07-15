import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NotificationSettingsPage from "../../src/app/(protected)/settings/notifications/page";
import { notificationService } from "../../src/services/notificationService";
import type { NotificationPreferences } from "../../src/types/notification";

vi.mock("../../src/services/notificationService", () => ({
  notificationService: {
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
    resetPreferences: vi.fn(),
    toggleAllEmail: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

function makePreferences(
  overrides: Partial<NotificationPreferences> = {}
): NotificationPreferences {
  return {
    email_messages: true,
    email_friend_requests: true,
    email_profile_views: false,
    email_ratings: false,
    email_forum_replies: true,
    email_mentions: true,
    email_promotions: false,
    email_newsletter: false,
    email_digest_frequency: "instant",
    push_messages: true,
    push_friend_requests: true,
    push_profile_views: false,
    push_ratings: false,
    push_forum_replies: true,
    push_mentions: true,
    ...overrides,
  };
}

describe("NotificationSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows a loading spinner initially", () => {
    vi.mocked(notificationService.getPreferences).mockReturnValue(new Promise(() => {}));
    const { container } = render(<NotificationSettingsPage />);
    expect(container.querySelector("svg.animate-spin")).not.toBeNull();
  });

  it("shows an error toast and a retry button when loading fails", async () => {
    vi.mocked(notificationService.getPreferences).mockRejectedValue(new Error("nope"));
    render(<NotificationSettingsPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load notification preferences");
    });
    expect(screen.getByText("Failed to load preferences")).toBeDefined();

    vi.mocked(notificationService.getPreferences).mockResolvedValue({
      preferences: makePreferences(),
      message: "ok",
    });
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeDefined();
    });
  });

  it("renders grouped settings sections once preferences load", async () => {
    vi.mocked(notificationService.getPreferences).mockResolvedValue({
      preferences: makePreferences(),
      message: "ok",
    });
    render(<NotificationSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Communication")).toBeDefined();
    });
    expect(screen.getByText("Activity")).toBeDefined();
    expect(screen.getByText("Marketing")).toBeDefined();
    expect(screen.getByText("Direct Messages")).toBeDefined();
    expect(screen.getByText("Profile Views")).toBeDefined();
    expect(screen.getByText("Promotions")).toBeDefined();
  });

  it("toggles a switch optimistically and confirms via the service call", async () => {
    vi.mocked(notificationService.getPreferences).mockResolvedValue({
      preferences: makePreferences({ email_messages: true }),
      message: "ok",
    });
    vi.mocked(notificationService.updatePreferences).mockResolvedValue({
      preferences: makePreferences({ email_messages: false }),
      message: "updated",
    });
    render(<NotificationSettingsPage />);

    await waitFor(() => screen.getByLabelText("Direct Messages"));
    const messagesSwitch = screen.getByLabelText("Direct Messages");
    expect(messagesSwitch.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(messagesSwitch);

    await waitFor(() => {
      expect(notificationService.updatePreferences).toHaveBeenCalledWith({
        email_messages: false,
      });
      expect(toast.success).toHaveBeenCalledWith("Preference updated");
    });
  });

  it("reverts the toggle and shows an error toast when the update fails", async () => {
    vi.mocked(notificationService.getPreferences).mockResolvedValue({
      preferences: makePreferences({ email_messages: true }),
      message: "ok",
    });
    vi.mocked(notificationService.updatePreferences).mockRejectedValue(new Error("fail"));
    render(<NotificationSettingsPage />);

    await waitFor(() => screen.getByLabelText("Direct Messages"));
    fireEvent.click(screen.getByLabelText("Direct Messages"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update preference");
    });
  });

  it("toggles a switch in the Activity section", async () => {
    vi.mocked(notificationService.getPreferences).mockResolvedValue({
      preferences: makePreferences({ email_profile_views: false }),
      message: "ok",
    });
    vi.mocked(notificationService.updatePreferences).mockResolvedValue({
      preferences: makePreferences({ email_profile_views: true }),
      message: "updated",
    });
    render(<NotificationSettingsPage />);

    await waitFor(() => screen.getByLabelText("Profile Views"));
    fireEvent.click(screen.getByLabelText("Profile Views"));

    await waitFor(() => {
      expect(notificationService.updatePreferences).toHaveBeenCalledWith({
        email_profile_views: true,
      });
    });
  });

  it("toggles a switch in the Marketing section", async () => {
    vi.mocked(notificationService.getPreferences).mockResolvedValue({
      preferences: makePreferences({ email_promotions: false }),
      message: "ok",
    });
    vi.mocked(notificationService.updatePreferences).mockResolvedValue({
      preferences: makePreferences({ email_promotions: true }),
      message: "updated",
    });
    render(<NotificationSettingsPage />);

    await waitFor(() => screen.getByLabelText("Promotions"));
    fireEvent.click(screen.getByLabelText("Promotions"));

    await waitFor(() => {
      expect(notificationService.updatePreferences).toHaveBeenCalledWith({
        email_promotions: true,
      });
    });
  });

  it("changes the digest frequency via the select dropdown", async () => {
    vi.mocked(notificationService.getPreferences).mockResolvedValue({
      preferences: makePreferences({ email_digest_frequency: "instant" }),
      message: "ok",
    });
    vi.mocked(notificationService.updatePreferences).mockResolvedValue({
      preferences: makePreferences({ email_digest_frequency: "daily" }),
      message: "updated",
    });
    render(<NotificationSettingsPage />);

    await waitFor(() => screen.getByRole("combobox"));
    expect(
      screen.getByText("You'll receive emails as events happen")
    ).toBeDefined();

    fireEvent.click(screen.getByRole("combobox"));
    await waitFor(() => screen.getByText("Daily Digest"));
    fireEvent.click(screen.getByText("Daily Digest"));

    await waitFor(() => {
      expect(notificationService.updatePreferences).toHaveBeenCalledWith({
        email_digest_frequency: "daily",
      });
      expect(toast.success).toHaveBeenCalledWith("Digest frequency updated");
    });
  });

  it("shows an error toast when the digest frequency update fails", async () => {
    vi.mocked(notificationService.getPreferences).mockResolvedValue({
      preferences: makePreferences({ email_digest_frequency: "instant" }),
      message: "ok",
    });
    vi.mocked(notificationService.updatePreferences).mockRejectedValue(new Error("fail"));
    render(<NotificationSettingsPage />);

    await waitFor(() => screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("combobox"));
    await waitFor(() => screen.getByText("Weekly Digest"));
    fireEvent.click(screen.getByText("Weekly Digest"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update digest frequency");
    });
  });

  it("shows the 'never' digest description copy", async () => {
    vi.mocked(notificationService.getPreferences).mockResolvedValue({
      preferences: makePreferences({ email_digest_frequency: "never" }),
      message: "ok",
    });
    render(<NotificationSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("You won't receive any email notifications")).toBeDefined();
    });
  });

  it("enables all emails via the Quick Actions button", async () => {
    vi.mocked(notificationService.getPreferences).mockResolvedValue({
      preferences: makePreferences(),
      message: "ok",
    });
    vi.mocked(notificationService.toggleAllEmail).mockResolvedValue({
      status: "ok",
      message: "All emails enabled",
      preferences: makePreferences({ email_messages: true }),
    });
    render(<NotificationSettingsPage />);

    await waitFor(() => screen.getByText("Enable All Emails"));
    fireEvent.click(screen.getByText("Enable All Emails"));

    await waitFor(() => {
      expect(notificationService.toggleAllEmail).toHaveBeenCalledWith(true);
      expect(toast.success).toHaveBeenCalledWith("All emails enabled");
    });
  });

  it("disables all emails via the Quick Actions button", async () => {
    vi.mocked(notificationService.getPreferences).mockResolvedValue({
      preferences: makePreferences(),
      message: "ok",
    });
    vi.mocked(notificationService.toggleAllEmail).mockResolvedValue({
      status: "ok",
      message: "All emails disabled",
      preferences: makePreferences({ email_messages: false }),
    });
    render(<NotificationSettingsPage />);

    await waitFor(() => screen.getByText("Disable All Emails"));
    fireEvent.click(screen.getByText("Disable All Emails"));

    await waitFor(() => {
      expect(notificationService.toggleAllEmail).toHaveBeenCalledWith(false);
      expect(toast.success).toHaveBeenCalledWith("All emails disabled");
    });
  });

  it("shows an error toast when toggling all emails fails", async () => {
    vi.mocked(notificationService.getPreferences).mockResolvedValue({
      preferences: makePreferences(),
      message: "ok",
    });
    vi.mocked(notificationService.toggleAllEmail).mockRejectedValue(new Error("fail"));
    render(<NotificationSettingsPage />);

    await waitFor(() => screen.getByText("Enable All Emails"));
    fireEvent.click(screen.getByText("Enable All Emails"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to toggle email notifications");
    });
  });

  it("resets preferences to defaults", async () => {
    vi.mocked(notificationService.getPreferences).mockResolvedValue({
      preferences: makePreferences(),
      message: "ok",
    });
    vi.mocked(notificationService.resetPreferences).mockResolvedValue({
      preferences: makePreferences(),
      message: "reset",
    });
    render(<NotificationSettingsPage />);

    await waitFor(() => screen.getByText("Reset to Defaults"));
    fireEvent.click(screen.getByText("Reset to Defaults"));

    await waitFor(() => {
      expect(notificationService.resetPreferences).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Preferences reset to defaults");
    });
  });

  it("shows an error toast when resetting preferences fails", async () => {
    vi.mocked(notificationService.getPreferences).mockResolvedValue({
      preferences: makePreferences(),
      message: "ok",
    });
    vi.mocked(notificationService.resetPreferences).mockRejectedValue(new Error("fail"));
    render(<NotificationSettingsPage />);

    await waitFor(() => screen.getByText("Reset to Defaults"));
    fireEvent.click(screen.getByText("Reset to Defaults"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to reset preferences");
    });
  });
});
