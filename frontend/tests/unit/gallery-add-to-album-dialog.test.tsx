import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddToAlbumDialog } from "../../src/components/gallery/AddToAlbumDialog";
import type { Album } from "../../src/types/gallery";

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

function makeAlbum(overrides: Partial<Album> = {}): Album {
  return {
    id: "album-1",
    user_id: "user-1",
    title: "Vacation",
    privacy: "PUBLIC",
    media_count: 3,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("AddToAlbumDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it("renders nothing and does not fetch when closed", () => {
    render(
      <AddToAlbumDialog mediaIds={["m1"]} isOpen={false} onClose={vi.fn()} />
    );
    expect(screen.queryByText("Add to Album")).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("fetches and lists albums when opened", async () => {
    const albums = [makeAlbum({ id: "a1", title: "Vacation" }), makeAlbum({ id: "a2", title: "Family" })];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: albums, next_cursor: null }),
    });

    render(<AddToAlbumDialog mediaIds={["m1"]} isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Vacation")).toBeDefined();
      expect(screen.getByText("Family")).toBeDefined();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/gallery/albums?limit=50",
      expect.any(Object)
    );
  });

  it("shows an empty state when the user has no albums", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [], next_cursor: null }),
    });

    render(<AddToAlbumDialog mediaIds={["m1"]} isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/no albums yet/i)).toBeDefined();
    });
  });

  it("shows an error toast when fetching albums fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false });

    render(<AddToAlbumDialog mediaIds={["m1"]} isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load albums");
    });
  });

  it("adds the selected media to an album and closes on success", async () => {
    const albums = [makeAlbum({ id: "a1", title: "Vacation" })];
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: albums, next_cursor: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ added_count: 2, album_media_count: 5 }),
      });

    render(
      <AddToAlbumDialog
        mediaIds={["m1", "m2"]}
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    await waitFor(() => expect(screen.getByText("Vacation")).toBeDefined());
    fireEvent.click(screen.getByText("Vacation"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/gallery/albums/a1/media",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ media_ids: ["m1", "m2"] }),
        })
      );
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Added 2 items to "Vacation"');
    });
    expect(handleSuccess).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("shows an 'already in album' toast when nothing new was added", async () => {
    const albums = [makeAlbum({ id: "a1", title: "Vacation" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: albums, next_cursor: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ added_count: 0, album_media_count: 5 }),
      });

    render(<AddToAlbumDialog mediaIds={["m1"]} isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Vacation")).toBeDefined());
    fireEvent.click(screen.getByText("Vacation"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Already in "Vacation"');
    });
  });

  it("shows an error toast when adding to an album fails", async () => {
    const albums = [makeAlbum({ id: "a1", title: "Vacation" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: albums, next_cursor: null }),
      })
      .mockResolvedValueOnce({ ok: false });

    render(<AddToAlbumDialog mediaIds={["m1"]} isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Vacation")).toBeDefined());
    fireEvent.click(screen.getByText("Vacation"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to add media to album");
    });
    // Dialog stays open on failure so the user can retry.
    expect(screen.getByText("Add to Album")).toBeDefined();
  });

  it("creates a new album and immediately adds the selected media to it", async () => {
    const newAlbum = makeAlbum({ id: "a-new", title: "New Trip" });
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [], next_cursor: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newAlbum),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ added_count: 1, album_media_count: 1 }),
      });

    render(<AddToAlbumDialog mediaIds={["m1"]} isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/no albums yet/i)).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /new album/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create Album" })).toBeDefined();
    });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "New Trip" } });
    fireEvent.click(screen.getByRole("button", { name: /create album/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "/api/gallery/albums",
        expect.objectContaining({ method: "POST" })
      );
    });
    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        3,
        "/api/gallery/albums/a-new/media",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ media_ids: ["m1"] }),
        })
      );
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Added 1 item to "New Trip"');
    });
  });

  it("closes via Cancel", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [], next_cursor: null }),
    });
    const handleClose = vi.fn();
    render(<AddToAlbumDialog mediaIds={["m1"]} isOpen={true} onClose={handleClose} />);
    await waitFor(() => expect(screen.getByText(/no albums yet/i)).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
