import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareDialog } from "../../src/components/gallery/ShareDialog";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";

beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("ShareDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it("renders the album title in the description", () => {
    render(
      <ShareDialog albumId="album-1" albumTitle="Vacation Photos" isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByText(/vacation photos/i)).toBeDefined();
  });

  it("renders nothing meaningful and does not call fetch when closed", () => {
    render(
      <ShareDialog albumId="album-1" albumTitle="Vacation Photos" isOpen={false} onClose={vi.fn()} />
    );
    expect(screen.queryByText("Share Album")).toBeNull();
  });

  it("generates a share link and displays the URL", async () => {
    const shareLink = {
      share_url: "/s/abc123",
      share_token: "abc123",
      expires_at: new Date("2099-01-01").toISOString(),
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(shareLink),
    });

    render(
      <ShareDialog albumId="album-1" albumTitle="Vacation Photos" isOpen={true} onClose={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /generate link/i }));

    await waitFor(() => {
      expect(screen.getByText(/share link generated/i)).toBeDefined();
    });

    const urlInput = screen.getByLabelText(/share url/i) as HTMLInputElement;
    expect(urlInput.value).toContain("/s/abc123");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/gallery/albums/album-1/share",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ expires_in_days: 7 }),
      })
    );
  });

  it("sends the selected expiry when generating a link", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          share_url: "/s/xyz",
          share_token: "xyz",
          expires_at: new Date().toISOString(),
        }),
    });

    render(
      <ShareDialog albumId="album-1" albumTitle="Vacation Photos" isOpen={true} onClose={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("combobox"));
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "30 days" })).toBeDefined();
    });
    fireEvent.click(screen.getByRole("option", { name: "30 days" }));

    fireEvent.click(screen.getByRole("button", { name: /generate link/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/gallery/albums/album-1/share",
        expect.objectContaining({
          body: JSON.stringify({ expires_in_days: 30 }),
        })
      );
    });
  });

  it("shows an error toast when link generation fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false });

    render(
      <ShareDialog albumId="album-1" albumTitle="Vacation Photos" isOpen={true} onClose={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /generate link/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to generate share link");
    });
    // Still in the "no link yet" state
    expect(screen.getByRole("button", { name: /generate link/i })).toBeDefined();
  });

  it("copies the link to the clipboard and shows a check icon", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: writeTextMock } });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          share_url: "/s/copyme",
          share_token: "copyme",
          expires_at: new Date().toISOString(),
        }),
    });

    render(
      <ShareDialog albumId="album-1" albumTitle="Vacation Photos" isOpen={true} onClose={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /generate link/i }));
    await waitFor(() => expect(screen.getByLabelText(/share url/i)).toBeDefined());

    const copyButton = screen.getAllByRole("button").find((b) => b.querySelector("svg.lucide-copy"));
    expect(copyButton).toBeDefined();

    fireEvent.click(copyButton!);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("/s/copyme"));
    });
    expect(toast.success).toHaveBeenCalledWith("Link copied to clipboard");
    await waitFor(() => {
      expect(document.querySelector("svg.lucide-check")).not.toBeNull();
    });

    vi.unstubAllGlobals();
  });

  it("shows an error toast when clipboard copy fails", async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: writeTextMock } });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          share_url: "/s/failcopy",
          share_token: "failcopy",
          expires_at: new Date().toISOString(),
        }),
    });

    render(
      <ShareDialog albumId="album-1" albumTitle="Vacation Photos" isOpen={true} onClose={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /generate link/i }));
    await waitFor(() => expect(screen.getByLabelText(/share url/i)).toBeDefined());

    const copyButton = screen.getAllByRole("button").find((b) => b.querySelector("svg.lucide-copy"));
    fireEvent.click(copyButton!);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to copy link");
    });

    vi.unstubAllGlobals();
  });

  it("resets state and calls onClose when Cancel/Done is clicked", async () => {
    const handleClose = vi.fn();
    render(
      <ShareDialog albumId="album-1" albumTitle="Vacation Photos" isOpen={true} onClose={handleClose} />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("closes via Dialog onOpenChange (e.g. Escape key)", () => {
    const handleClose = vi.fn();
    render(
      <ShareDialog albumId="album-1" albumTitle="Vacation Photos" isOpen={true} onClose={handleClose} />
    );

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    expect(handleClose).toHaveBeenCalled();
  });

  it("reverts the copied indicator back after the 2s timeout", async () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: writeTextMock } });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          share_url: "/s/revert",
          share_token: "revert",
          expires_at: new Date().toISOString(),
        }),
    });

    render(
      <ShareDialog albumId="album-1" albumTitle="Vacation Photos" isOpen={true} onClose={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /generate link/i }));
    // Flush the fetch/json promise chain under fake timers.
    await vi.waitFor(() => expect(screen.getByLabelText(/share url/i)).toBeDefined());

    const copyButton = screen.getAllByRole("button").find((b) => b.querySelector("svg.lucide-copy"));
    await fireEvent.click(copyButton!);
    await vi.waitFor(() => expect(document.querySelector("svg.lucide-check")).not.toBeNull());

    vi.advanceTimersByTime(2000);
    await vi.waitFor(() => expect(document.querySelector("svg.lucide-check")).toBeNull());

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows 'Done' instead of 'Cancel' once a link has been generated", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          share_url: "/s/done",
          share_token: "done",
          expires_at: new Date().toISOString(),
        }),
    });

    render(
      <ShareDialog albumId="album-1" albumTitle="Vacation Photos" isOpen={true} onClose={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /generate link/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^done$/i })).toBeDefined();
    });
    expect(screen.queryByRole("button", { name: /^cancel$/i })).toBeNull();
  });
});
