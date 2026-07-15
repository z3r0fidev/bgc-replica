import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { InstallPrompt } from "../../src/components/pwa/install-prompt";

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

class FakeBeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;

  constructor(outcome: "accepted" | "dismissed" = "accepted") {
    super("beforeinstallprompt", { cancelable: true });
    this.prompt = vi.fn().mockResolvedValue(undefined);
    this.userChoice = Promise.resolve({ outcome });
  }
}

describe("InstallPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    stubMatchMedia(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("renders nothing initially (before beforeinstallprompt fires)", () => {
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when already installed (standalone display-mode)", () => {
    stubMatchMedia(true);
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the prompt 3s after beforeinstallprompt fires", () => {
    vi.useFakeTimers();
    render(<InstallPrompt />);

    act(() => {
      window.dispatchEvent(new FakeBeforeInstallPromptEvent());
    });
    expect(screen.queryByText(/install bgclive/i)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText(/install bgclive/i)).toBeDefined();
  });

  it("does not show the prompt when recently dismissed (< 7 days ago)", () => {
    localStorage.setItem("pwa-prompt-dismissed", new Date().toISOString());
    vi.useFakeTimers();
    render(<InstallPrompt />);

    act(() => {
      window.dispatchEvent(new FakeBeforeInstallPromptEvent());
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText(/install bgclive/i)).toBeNull();
  });

  it("shows the prompt again when dismissed more than 7 days ago", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    localStorage.setItem("pwa-prompt-dismissed", eightDaysAgo.toISOString());
    vi.useFakeTimers();
    render(<InstallPrompt />);

    act(() => {
      window.dispatchEvent(new FakeBeforeInstallPromptEvent());
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText(/install bgclive/i)).toBeDefined();
  });

  it("clicking Install calls prompt() and, on accepted outcome, hides the prompt (installed)", async () => {
    vi.useFakeTimers();
    render(<InstallPrompt />);
    const event = new FakeBeforeInstallPromptEvent("accepted");

    act(() => {
      window.dispatchEvent(event);
      vi.advanceTimersByTime(3000);
    });

    const installButton = screen.getByRole("button", { name: /^install$/i });
    await act(async () => {
      installButton.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/install bgclive/i)).toBeNull();
  });

  it("clicking Install with a dismissed outcome hides the prompt but does not mark installed", async () => {
    vi.useFakeTimers();
    render(<InstallPrompt />);
    const event = new FakeBeforeInstallPromptEvent("dismissed");

    act(() => {
      window.dispatchEvent(event);
      vi.advanceTimersByTime(3000);
    });

    const installButton = screen.getByRole("button", { name: /^install$/i });
    await act(async () => {
      installButton.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText(/install bgclive/i)).toBeNull();
  });

  it("clicking 'Not Now' hides the prompt and records the dismissal timestamp", () => {
    vi.useFakeTimers();
    render(<InstallPrompt />);

    act(() => {
      window.dispatchEvent(new FakeBeforeInstallPromptEvent());
      vi.advanceTimersByTime(3000);
    });

    act(() => {
      screen.getByRole("button", { name: /not now/i }).click();
    });

    expect(screen.queryByText(/install bgclive/i)).toBeNull();
    expect(localStorage.getItem("pwa-prompt-dismissed")).not.toBeNull();
  });

  it("clicking the X close button also dismisses and records the timestamp", () => {
    vi.useFakeTimers();
    const { container } = render(<InstallPrompt />);

    act(() => {
      window.dispatchEvent(new FakeBeforeInstallPromptEvent());
      vi.advanceTimersByTime(3000);
    });

    const closeButton = Array.from(container.querySelectorAll("button")).find((b) =>
      b.querySelector("svg.lucide-x")
    );
    expect(closeButton).toBeDefined();
    act(() => {
      closeButton!.click();
    });

    expect(screen.queryByText(/install bgclive/i)).toBeNull();
    expect(localStorage.getItem("pwa-prompt-dismissed")).not.toBeNull();
  });

  it("hides and marks installed when the appinstalled event fires", () => {
    vi.useFakeTimers();
    render(<InstallPrompt />);

    act(() => {
      window.dispatchEvent(new FakeBeforeInstallPromptEvent());
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText(/install bgclive/i)).toBeDefined();

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(screen.queryByText(/install bgclive/i)).toBeNull();
  });
});
