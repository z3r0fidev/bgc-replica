import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GalleryPage from "../../src/app/(protected)/gallery/page";
import type { GalleryMedia } from "../../src/types/gallery";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));
import { toast } from "sonner";

// The gallery child components (MediaUploader, GalleryGrid, MediaLightbox) are
// already unit-tested standalone. Mock them so this test only exercises the
// page's own data-fetching/state logic.
vi.mock("../../src/components/gallery", () => ({
  MediaUploader: ({ onUploadComplete }: { onUploadComplete: (m: GalleryMedia) => void }) => (
    <button onClick={() => onUploadComplete(makeMedia({ id: "uploaded-1" }))}>
      mock-upload
    </button>
  ),
  GalleryGrid: ({
    items,
    onItemClick,
    onLoadMore,
    selectable,
    selectedIds,
    onSelectionChange,
  }: {
    items: GalleryMedia[];
    onItemClick?: (item: GalleryMedia, index: number) => void;
    onLoadMore?: () => void;
    selectable?: boolean;
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
  }) => (
    <div data-testid="gallery-grid">
      {items.map((item, index) => (
        <button
          key={item.id}
          data-testid={`item-${item.id}`}
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
      <button data-testid="load-more" onClick={() => onLoadMore?.()}>
        load-more
      </button>
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
        <button onClick={() => items[0] && onDelete?.(items[0])}>lightbox-delete</button>
      </div>
    ) : null,
}));

function makeMedia(overrides: Partial<GalleryMedia> = {}): GalleryMedia {
  return {
    id: "media-1",
    user_id: "user-1",
    type: "IMAGE",
    url: "https://example.com/a.jpg",
    privacy: "PUBLIC",
    view_count: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("GalleryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it("fetches media on mount and renders the count", async () => {
    const items = [makeMedia({ id: "m1" }), makeMedia({ id: "m2" })];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items, next_cursor: null, total_count: 2 }),
    });

    render(<GalleryPage />);

    await waitFor(() => {
      expect(screen.getByText("2 items")).toBeDefined();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/gallery/?"),
      expect.any(Object)
    );
  });

  it("shows a toast error when the initial fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    render(<GalleryPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load gallery");
    });
  });

  it("re-fetches with a type filter when Photos is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], next_cursor: null, total_count: 0 }),
    });

    render(<GalleryPage />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Photos" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("type=IMAGE"),
        expect.any(Object)
      );
    });
  });

  it("prepends newly uploaded media and increments total count", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [], next_cursor: null, total_count: 0 }),
    });

    render(<GalleryPage />);
    await waitFor(() => expect(screen.getByText("0 items")).toBeDefined());

    // Radix TabsTrigger switches on mousedown.
    fireEvent.mouseDown(screen.getByRole("tab", { name: /upload/i }), { button: 0 });
    fireEvent.click(screen.getByText("mock-upload"));

    await waitFor(() => {
      expect(screen.getByText("1 item")).toBeDefined();
    });
  });

  it("opens the lightbox when a gallery item is clicked", async () => {
    const items = [makeMedia({ id: "m1" })];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items, next_cursor: null, total_count: 1 }),
    });

    render(<GalleryPage />);
    await waitFor(() => expect(screen.getByTestId("item-m1")).toBeDefined());

    fireEvent.click(screen.getByTestId("item-m1"));

    await waitFor(() => {
      expect(screen.getByTestId("lightbox")).toBeDefined();
    });
  });

  it("deletes an item via the lightbox delete confirmation flow", async () => {
    const items = [makeMedia({ id: "m1" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items, next_cursor: null, total_count: 1 }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    render(<GalleryPage />);
    await waitFor(() => expect(screen.getByTestId("item-m1")).toBeDefined());

    fireEvent.click(screen.getByTestId("item-m1"));
    await waitFor(() => expect(screen.getByTestId("lightbox")).toBeDefined());

    fireEvent.click(screen.getByText("lightbox-delete"));

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/gallery/m1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Media deleted");
    });
  });

  it("enters selection mode, selects items, and bulk-deletes them", async () => {
    const items = [makeMedia({ id: "m1" }), makeMedia({ id: "m2" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items, next_cursor: null, total_count: 2 }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    render(<GalleryPage />);
    await waitFor(() => expect(screen.getByTestId("item-m1")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    fireEvent.click(screen.getByTestId("item-m1"));
    fireEvent.click(screen.getByTestId("item-m2"));

    fireEvent.click(screen.getByRole("button", { name: /delete \(2\)/i }));

    await waitFor(() => {
      expect(screen.getByText("Delete 2 items?")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete All" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("2 items deleted");
    });
  });

  it("loads more items when GalleryGrid requests it and a next cursor exists", async () => {
    const page1 = [makeMedia({ id: "m1" })];
    const page2 = [makeMedia({ id: "m2" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: page1, next_cursor: "cursor-2", total_count: 2 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: page2, next_cursor: null, total_count: 2 }),
      });

    render(<GalleryPage />);
    await waitFor(() => expect(screen.getByTestId("item-m1")).toBeDefined());

    fireEvent.click(screen.getByTestId("load-more"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("cursor=cursor-2"),
        expect.any(Object)
      );
    });
    await waitFor(() => expect(screen.getByTestId("item-m2")).toBeDefined());
  });

  it("shows the 'Add to Album' info toast (not-yet-implemented action)", async () => {
    const items = [makeMedia({ id: "m1" })];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items, next_cursor: null, total_count: 1 }),
    });

    render(<GalleryPage />);
    await waitFor(() => expect(screen.getByTestId("item-m1")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    fireEvent.click(screen.getByTestId("item-m1"));
    fireEvent.click(screen.getByRole("button", { name: /add to album/i }));

    expect(toast.info).toHaveBeenCalledWith("Add to album coming soon");
  });

  it("shows a toast error when the item delete request is not ok", async () => {
    const items = [makeMedia({ id: "m1" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items, next_cursor: null, total_count: 1 }),
      })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });

    render(<GalleryPage />);
    await waitFor(() => expect(screen.getByTestId("item-m1")).toBeDefined());

    fireEvent.click(screen.getByTestId("item-m1"));
    await waitFor(() => expect(screen.getByTestId("lightbox")).toBeDefined());
    fireEvent.click(screen.getByText("lightbox-delete"));
    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete media");
    });
  });

  it("shows a toast error when the bulk delete request throws", async () => {
    const items = [makeMedia({ id: "m1" }), makeMedia({ id: "m2" })];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items, next_cursor: null, total_count: 2 }),
      })
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"));

    render(<GalleryPage />);
    await waitFor(() => expect(screen.getByTestId("item-m1")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    fireEvent.click(screen.getByTestId("item-m1"));
    fireEvent.click(screen.getByTestId("item-m2"));
    fireEvent.click(screen.getByRole("button", { name: /delete \(2\)/i }));
    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Delete All" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete some items");
    });
  });

  it("cancels selection mode, clearing any selected items", async () => {
    const items = [makeMedia({ id: "m1" })];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items, next_cursor: null, total_count: 1 }),
    });

    render(<GalleryPage />);
    await waitFor(() => expect(screen.getByTestId("item-m1")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    fireEvent.click(screen.getByTestId("item-m1"));
    expect(screen.getByRole("button", { name: /delete \(1\)/i })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "Select" })).toBeDefined();
    expect(screen.queryByRole("button", { name: /delete \(/i })).toBeNull();
  });

  it("re-fetches with a type filter when Videos is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], next_cursor: null, total_count: 0 }),
    });

    render(<GalleryPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Videos" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining("type=VIDEO"),
        expect.any(Object)
      );
    });
  });
});
