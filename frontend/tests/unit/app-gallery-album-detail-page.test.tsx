import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AlbumDetailPage from "../../src/app/(protected)/gallery/albums/[id]/page";
import type { Album, AlbumWithMedia, GalleryMedia, GalleryMediaWithPosition } from "../../src/types/gallery";

const mockPush = vi.fn();
// useRouter must return a referentially-stable object across renders: the
// page's fetchAlbum useCallback depends on [albumId, router], and a new
// object literal on every call would recreate the callback (and thus retrigger
// the effect) on every render, causing an infinite update loop.
const mockRouter = { push: mockPush };
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "album-1" }),
  useRouter: () => mockRouter,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
import { toast } from "sonner";

// Gallery child components are already unit-tested standalone; mock them here
// so this test exercises only the album-detail page's own logic.
vi.mock("../../src/components/gallery", () => ({
  GalleryGrid: ({
    items,
    onItemClick,
    selectable,
    selectedIds,
    onSelectionChange,
  }: {
    items: GalleryMedia[];
    onItemClick?: (item: GalleryMedia, index: number) => void;
    selectable?: boolean;
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
  }) => (
    <div data-testid="gallery-grid">
      {items.map((item, index) => (
        <button
          key={item.id}
          data-testid={`grid-item-${item.id}`}
          onClick={() => {
            if (selectable && onSelectionChange) {
              const next = new Set(selectedIds);
              if (next.has(item.id)) next.delete(item.id);
              else next.add(item.id);
              onSelectionChange(next);
            } else {
              onItemClick?.(item, index);
            }
          }}
        >
          {item.id}
        </button>
      ))}
    </div>
  ),
  MediaLightbox: ({
    isOpen,
    items,
    onDelete,
  }: {
    isOpen: boolean;
    items: GalleryMedia[];
    initialIndex: number;
    onClose: () => void;
    onDelete?: (item: GalleryMedia) => void;
  }) =>
    isOpen ? (
      <div data-testid="lightbox">
        lightbox-open
        <button onClick={() => items[0] && onDelete?.(items[0])}>lightbox-remove</button>
      </div>
    ) : null,
  SortableAlbumGrid: ({
    items,
    onReorder,
  }: {
    items: GalleryMediaWithPosition[];
    onReorder: (items: GalleryMedia[]) => void;
  }) => (
    <div data-testid="sortable-grid">
      sortable-{items.length}
      <button onClick={() => onReorder([...items].reverse())}>reorder</button>
    </div>
  ),
  ShareDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="share-dialog">share-dialog-open</div> : null,
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
        album-editor-open
        <button onClick={() => album && onSave({ ...album, title: "Renamed album" })}>
          save-editor
        </button>
      </div>
    ) : null,
}));

function makeMedia(overrides: Partial<GalleryMediaWithPosition> = {}): GalleryMediaWithPosition {
  return {
    id: "media-1",
    user_id: "user-1",
    type: "IMAGE",
    url: "https://example.com/a.jpg",
    privacy: "PUBLIC",
    view_count: 0,
    created_at: new Date().toISOString(),
    position: 0,
    ...overrides,
  };
}

function makeAlbum(overrides: Partial<AlbumWithMedia> = {}): AlbumWithMedia {
  return {
    id: "album-1",
    user_id: "user-1",
    title: "My Album",
    privacy: "PUBLIC",
    media_count: 0,
    created_at: new Date().toISOString(),
    media: [],
    ...overrides,
  };
}

describe("AlbumDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it("fetches and renders the album", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeAlbum({ title: "Vacation" })),
    });

    render(<AlbumDetailPage />);

    // "Vacation" appears both in the breadcrumb and the <h1>; assert on the heading.
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Vacation" })).toBeDefined();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/gallery/albums/album-1",
      expect.any(Object)
    );
  });

  it("redirects to /gallery/albums when the album is not found (404)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    });

    render(<AlbumDetailPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/gallery/albums");
    });
  });

  it("shows a toast error and renders nothing when the fetch throws", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("network"));

    const { container } = render(<AlbumDetailPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load album");
    });
    expect(container.textContent).toBe("");
  });

  it("shows the empty-album state with an Add Photos button when there is no media", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeAlbum({ media: [] })),
    });

    render(<AlbumDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("This album is empty")).toBeDefined();
    });
  });

  it("renders the PRIVATE privacy badge", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeAlbum({ privacy: "PRIVATE" })),
    });

    render(<AlbumDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Private")).toBeDefined();
    });
  });

  it("renders the FRIENDS_ONLY privacy badge", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeAlbum({ privacy: "FRIENDS_ONLY" })),
    });

    render(<AlbumDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Friends Only")).toBeDefined();
    });
  });

  it("renders GalleryGrid (not the sortable grid) when there is media and reorder mode is off", async () => {
    const media = [makeMedia({ id: "m1" }), makeMedia({ id: "m2", position: 1 })];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeAlbum({ media, media_count: 2 })),
    });

    render(<AlbumDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("gallery-grid")).toBeDefined();
    });
    expect(screen.queryByTestId("sortable-grid")).toBeNull();
  });

  it("disables the Reorder button when there are fewer than 2 items", async () => {
    const media = [makeMedia({ id: "m1" })];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeAlbum({ media, media_count: 1 })),
    });

    render(<AlbumDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reorder/i })).toBeDisabled();
    });
  });

  it("toggles reorder mode and saves a new order via PUT, showing a success toast", async () => {
    const media = [makeMedia({ id: "m1" }), makeMedia({ id: "m2", position: 1 })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeAlbum({ media, media_count: 2 })),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    render(<AlbumDetailPage />);
    await waitFor(() => expect(screen.getByTestId("gallery-grid")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /reorder/i }));
    await waitFor(() => expect(screen.getByTestId("sortable-grid")).toBeDefined());

    fireEvent.click(screen.getByText("reorder"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/gallery/albums/album-1/reorder",
        expect.objectContaining({ method: "PUT" })
      );
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Order saved");
    });
  });

  it("reverts and shows a toast error when saving the new order fails", async () => {
    const media = [makeMedia({ id: "m1" }), makeMedia({ id: "m2", position: 1 })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeAlbum({ media, media_count: 2 })),
      })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeAlbum({ media, media_count: 2 })),
      });

    render(<AlbumDetailPage />);
    await waitFor(() => expect(screen.getByTestId("gallery-grid")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /reorder/i }));
    await waitFor(() => expect(screen.getByTestId("sortable-grid")).toBeDefined());
    fireEvent.click(screen.getByText("reorder"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to save order");
    });
    // Reverting re-fetches the album
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("opens the add-media dialog, fetches available media excluding items already in the album, and adds selected items", async () => {
    const albumMedia = [makeMedia({ id: "m1" })];
    const available = [makeMedia({ id: "m1" }), makeMedia({ id: "m2" }), makeMedia({ id: "m3" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeAlbum({ media: albumMedia, media_count: 1 })),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: available, total_count: 3 }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeAlbum({ media: albumMedia, media_count: 1 })),
      });

    render(<AlbumDetailPage />);
    await waitFor(() => expect(screen.getByTestId("gallery-grid")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /add photos/i }));

    await waitFor(() => {
      expect(screen.getByText("Add Photos to Album")).toBeDefined();
    });
    // m1 is already in the album, so it should be filtered out of the dialog's
    // available-media grid. It still appears once, from the main album grid
    // rendered behind the dialog, so assert there's only that one instance.
    await waitFor(() => {
      expect(screen.getAllByTestId("grid-item-m1")).toHaveLength(1);
      expect(screen.getByTestId("grid-item-m2")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("grid-item-m2"));
    fireEvent.click(screen.getByRole("button", { name: /^add \(1\)$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/gallery/albums/album-1/media",
        expect.objectContaining({ method: "POST" })
      );
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Added 1 items to album");
    });
  });

  it("shows a toast error when adding media fails", async () => {
    const albumMedia = [makeMedia({ id: "m1" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeAlbum({ media: albumMedia, media_count: 1 })),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [makeMedia({ id: "m2" })], total_count: 1 }),
      })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });

    render(<AlbumDetailPage />);
    await waitFor(() => expect(screen.getByTestId("gallery-grid")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /add photos/i }));
    await waitFor(() => expect(screen.getByTestId("grid-item-m2")).toBeDefined());

    fireEvent.click(screen.getByTestId("grid-item-m2"));
    fireEvent.click(screen.getByRole("button", { name: /^add \(1\)$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to add media");
    });
  });

  it("opens the lightbox, removes media via the confirmation dialog, and decrements the count", async () => {
    const media = [makeMedia({ id: "m1" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeAlbum({ media, media_count: 1 })),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    render(<AlbumDetailPage />);
    await waitFor(() => expect(screen.getByTestId("grid-item-m1")).toBeDefined());

    fireEvent.click(screen.getByTestId("grid-item-m1"));
    await waitFor(() => expect(screen.getByTestId("lightbox")).toBeDefined());

    fireEvent.click(screen.getByText("lightbox-remove"));

    await waitFor(() => {
      expect(screen.getByText("Remove from album?")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/gallery/albums/album-1/media/m1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Removed from album");
    });
    // The count and "items"/"item" label render as separate JSX text nodes,
    // so match loosely against the whole document rather than an exact string.
    expect(document.body.textContent).toMatch(/0\s*items/);
  });

  it("shows a toast error when removing media fails", async () => {
    const media = [makeMedia({ id: "m1" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeAlbum({ media, media_count: 1 })),
      })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });

    render(<AlbumDetailPage />);
    await waitFor(() => expect(screen.getByTestId("grid-item-m1")).toBeDefined());

    fireEvent.click(screen.getByTestId("grid-item-m1"));
    await waitFor(() => expect(screen.getByTestId("lightbox")).toBeDefined());
    fireEvent.click(screen.getByText("lightbox-remove"));
    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to remove media");
    });
  });

  it("deletes the album via the confirmation dialog and navigates back to the albums list", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeAlbum()),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    render(<AlbumDetailPage />);
    await waitFor(() => expect(screen.getByText("This album is empty")).toBeDefined());

    const deleteTriggerButton = screen
      .getAllByRole("button")
      .find((b) => b.className.includes("text-destructive"))!;
    fireEvent.click(deleteTriggerButton);

    await waitFor(() => {
      expect(screen.getByText("Delete “My Album”?")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete Album" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/gallery/albums/album-1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/gallery/albums");
    });
  });

  it("shows a toast error when album deletion fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeAlbum()),
      })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });

    render(<AlbumDetailPage />);
    await waitFor(() => expect(screen.getByText("This album is empty")).toBeDefined());

    const deleteTriggerButton = screen
      .getAllByRole("button")
      .find((b) => b.className.includes("text-destructive"))!;
    fireEvent.click(deleteTriggerButton);
    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Delete Album" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete album");
    });
  });

  it("edits the album title through the AlbumEditor and updates it in place", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeAlbum({ title: "Original" })),
    });

    render(<AlbumDetailPage />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Original" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    await waitFor(() => expect(screen.getByTestId("album-editor")).toBeDefined());

    fireEvent.click(screen.getByText("save-editor"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Renamed album" })).toBeDefined();
    });
  });

  it("opens the ShareDialog when Share is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeAlbum()),
    });

    render(<AlbumDetailPage />);
    await waitFor(() => expect(screen.getByText("This album is empty")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => {
      expect(screen.getByTestId("share-dialog")).toBeDefined();
    });
  });
});
