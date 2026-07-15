import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AlbumsPage from "../../src/app/(protected)/gallery/albums/page";
import type { Album } from "../../src/types/gallery";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
import { toast } from "sonner";

// AlbumCard and AlbumEditor are already unit-tested standalone (tests/unit/gallery.test.tsx).
// Mock them here so this test only exercises the page's own data/state logic.
vi.mock("../../src/components/gallery/AlbumCard", () => ({
  AlbumCard: ({
    album,
    onEdit,
    onDelete,
    onShare,
  }: {
    album: Album;
    onEdit: (a: Album) => void;
    onDelete: (a: Album) => void;
    onShare: (a: Album) => void;
  }) => (
    <div data-testid={`album-${album.id}`}>
      {album.title}
      <button onClick={() => onEdit(album)}>edit-{album.id}</button>
      <button onClick={() => onDelete(album)}>delete-{album.id}</button>
      <button onClick={() => onShare(album)}>share-{album.id}</button>
    </div>
  ),
}));

vi.mock("../../src/components/gallery/AlbumEditor", () => ({
  AlbumEditor: ({
    isOpen,
    album,
    onSave,
  }: {
    isOpen: boolean;
    album: Album | null;
    onClose: () => void;
    onSave: (a: Album) => void;
  }) =>
    isOpen ? (
      <div data-testid="album-editor">
        {album ? "edit-mode" : "create-mode"}
        <button
          onClick={() =>
            onSave(album ? { ...album, title: "Updated title" } : makeAlbum({ id: "new-album" }))
          }
        >
          save-editor
        </button>
      </div>
    ) : null,
}));

function makeAlbum(overrides: Partial<Album> = {}): Album {
  return {
    id: "album-1",
    user_id: "user-1",
    title: "Album One",
    privacy: "PUBLIC",
    media_count: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("AlbumsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it("fetches albums on mount and shows the count", async () => {
    const items = [makeAlbum({ id: "a1" }), makeAlbum({ id: "a2" })];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items, next_cursor: null }),
    });

    render(<AlbumsPage />);

    await waitFor(() => {
      expect(screen.getByText("2 albums")).toBeDefined();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/gallery/albums?"),
      expect.any(Object)
    );
  });

  it("shows the empty state and a toast error when the fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    render(<AlbumsPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load albums");
    });
    expect(screen.getByText("No albums yet")).toBeDefined();
  });

  it("opens the editor in create mode and prepends the newly saved album", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [], next_cursor: null }),
    });

    render(<AlbumsPage />);
    await waitFor(() => expect(screen.getByText("No albums yet")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /create album/i }));

    await waitFor(() => {
      expect(screen.getByText("create-mode")).toBeDefined();
    });

    fireEvent.click(screen.getByText("save-editor"));

    await waitFor(() => {
      expect(screen.getByTestId("album-new-album")).toBeDefined();
    });
  });

  it("opens the editor in edit mode for an existing album and updates it in place", async () => {
    const items = [makeAlbum({ id: "a1", title: "Original title" })];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items, next_cursor: null }),
    });

    render(<AlbumsPage />);
    await waitFor(() => expect(screen.getByTestId("album-a1")).toBeDefined());

    fireEvent.click(screen.getByText("edit-a1"));

    await waitFor(() => {
      expect(screen.getByText("edit-mode")).toBeDefined();
    });

    fireEvent.click(screen.getByText("save-editor"));

    await waitFor(() => {
      expect(screen.getByTestId("album-a1").textContent).toContain("Updated title");
    });
  });

  it("deletes an album through the confirmation dialog", async () => {
    const items = [makeAlbum({ id: "a1", title: "To delete" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items, next_cursor: null }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    render(<AlbumsPage />);
    await waitFor(() => expect(screen.getByTestId("album-a1")).toBeDefined());

    fireEvent.click(screen.getByText("delete-a1"));

    await waitFor(() => {
      expect(screen.getByText("Delete “To delete”?")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/gallery/albums/a1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Album deleted");
    });
    expect(screen.queryByTestId("album-a1")).toBeNull();
  });

  it("shows a toast error when album deletion fails", async () => {
    const items = [makeAlbum({ id: "a1" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items, next_cursor: null }),
      })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });

    render(<AlbumsPage />);
    await waitFor(() => expect(screen.getByTestId("album-a1")).toBeDefined());

    fireEvent.click(screen.getByText("delete-a1"));
    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete album");
    });
  });

  it("creates a share link, copies it to the clipboard, and shows a success toast", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: writeTextMock } });

    const items = [makeAlbum({ id: "a1" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items, next_cursor: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ share_url: "/s/abc123" }),
      });

    render(<AlbumsPage />);
    await waitFor(() => expect(screen.getByTestId("album-a1")).toBeDefined());

    fireEvent.click(screen.getByText("share-a1"));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("/s/abc123"));
    });
    expect(toast.success).toHaveBeenCalledWith("Share link copied to clipboard!");

    vi.unstubAllGlobals();
  });

  it("shows a toast error when share link creation fails", async () => {
    const items = [makeAlbum({ id: "a1" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items, next_cursor: null }),
      })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });

    render(<AlbumsPage />);
    await waitFor(() => expect(screen.getByTestId("album-a1")).toBeDefined());

    fireEvent.click(screen.getByText("share-a1"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to create share link");
    });
  });

  it("loads more albums when Load More is clicked", async () => {
    const page1 = [makeAlbum({ id: "a1" })];
    const page2 = [makeAlbum({ id: "a2" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: page1, next_cursor: "cursor-2" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: page2, next_cursor: null }),
      });

    render(<AlbumsPage />);
    await waitFor(() => expect(screen.getByTestId("album-a1")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("cursor=cursor-2"),
        expect.any(Object)
      );
    });
    await waitFor(() => expect(screen.getByTestId("album-a2")).toBeDefined());
  });
});
