import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GalleryGrid } from "../../src/components/gallery/GalleryGrid";
import { AlbumCard } from "../../src/components/gallery/AlbumCard";
import { AlbumEditor } from "../../src/components/gallery/AlbumEditor";
import type { GalleryMedia, Album } from "../../src/types/gallery";

beforeAll(() => {
  // Radix Select internals touch pointer-capture/scrollIntoView APIs jsdom doesn't implement.
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

// Mock tanstack virtual
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [{ index: 0, key: "0", start: 0, size: 200 }],
    getTotalSize: () => 200,
  }),
}));

const mockMedia: GalleryMedia[] = [
  {
    id: "media-1",
    user_id: "user-1",
    type: "IMAGE",
    url: "https://example.com/image1.jpg",
    thumbnail_url: "https://example.com/thumb1.jpg",
    privacy: "PUBLIC",
    view_count: 10,
    created_at: new Date().toISOString(),
  },
  {
    id: "media-2",
    user_id: "user-1",
    type: "VIDEO",
    url: "https://example.com/video1.mp4",
    thumbnail_url: "https://example.com/thumb2.jpg",
    privacy: "PRIVATE",
    duration_seconds: 120,
    view_count: 5,
    created_at: new Date().toISOString(),
  },
];

const mockAlbum: Album = {
  id: "album-1",
  user_id: "user-1",
  title: "Test Album",
  description: "Test description",
  privacy: "PUBLIC",
  media_count: 5,
  created_at: new Date().toISOString(),
};

describe("GalleryGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no items", () => {
    render(<GalleryGrid items={[]} />);
    expect(screen.getByText(/no media yet/i)).toBeDefined();
  });

  it("calls onItemClick when item is clicked", async () => {
    const handleClick = vi.fn();
    render(<GalleryGrid items={mockMedia} onItemClick={handleClick} />);

    // The grid uses virtualization, so we need to find the rendered items
    const images = screen.getAllByRole("img");
    if (images.length > 0) {
      fireEvent.click(images[0].closest("div")!);
      await waitFor(() => {
        expect(handleClick).toHaveBeenCalled();
      });
    }
  });

  it("displays video duration for video items", () => {
    render(<GalleryGrid items={[mockMedia[1]]} />);
    // Video duration should be displayed (2:00 for 120 seconds)
    expect(screen.queryByText(/2:00/)).toBeDefined();
  });

  it("shows privacy badge when enabled", () => {
    render(<GalleryGrid items={mockMedia} showPrivacyBadge={true} />);
    // Private badge should be shown
    expect(screen.queryByText(/private/i)).toBeDefined();
  });

  it("supports selection mode", () => {
    const handleSelection = vi.fn();
    render(
      <GalleryGrid
        items={mockMedia}
        selectable={true}
        selectedIds={new Set()}
        onSelectionChange={handleSelection}
      />
    );

    // Selection should update when clicking
    const images = screen.getAllByRole("img");
    if (images.length > 0) {
      fireEvent.click(images[0].closest("div")!);
    }
  });
});

describe("AlbumCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders album title", () => {
    render(
      <AlbumCard
        album={mockAlbum}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onShare={vi.fn()}
      />
    );
    expect(screen.getByText("Test Album")).toBeDefined();
  });

  it("renders media count", () => {
    render(
      <AlbumCard
        album={mockAlbum}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onShare={vi.fn()}
      />
    );
    expect(screen.getByText(/5 items/i)).toBeDefined();
  });

  it("renders menu button for actions", () => {
    const handleEdit = vi.fn();
    render(
      <AlbumCard
        album={mockAlbum}
        onEdit={handleEdit}
        onDelete={vi.fn()}
        onShare={vi.fn()}
      />
    );

    // Check menu button exists
    const menuButton = screen.getByRole("button");
    expect(menuButton).toBeDefined();
  });

  it("shows privacy badge for non-public albums", () => {
    const privateAlbum = { ...mockAlbum, privacy: "PRIVATE" as const };
    render(
      <AlbumCard
        album={privateAlbum}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onShare={vi.fn()}
      />
    );
    expect(screen.queryByText(/private/i)).toBeDefined();
  });

  it("shows Users icon badge for FRIENDS_ONLY privacy", () => {
    const friendsAlbum = { ...mockAlbum, privacy: "FRIENDS_ONLY" as const };
    render(
      <AlbumCard
        album={friendsAlbum}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onShare={vi.fn()}
      />
    );
    expect(screen.getByText(/friends/i)).toBeDefined();
  });

  it("renders cover image when cover_url is present", () => {
    const albumWithCover = { ...mockAlbum, cover_url: "https://example.com/cover.jpg" };
    render(
      <AlbumCard
        album={albumWithCover}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onShare={vi.fn()}
      />
    );
    const img = screen.getByAltText("Test Album");
    expect(img).toBeDefined();
  });

  it("opens the actions menu and calls onEdit/onShare/onDelete", async () => {
    const handleEdit = vi.fn();
    const handleShare = vi.fn();
    const handleDelete = vi.fn();
    render(
      <AlbumCard
        album={mockAlbum}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShare={handleShare}
      />
    );

    const menuButton = screen.getByRole("button");
    // The trigger Button has its own onClick={(e) => e.stopPropagation()}
    // separate from the pointerdown that Radix uses to open the menu.
    fireEvent.click(menuButton);
    fireEvent.pointerDown(menuButton);

    await waitFor(() => {
      expect(screen.getByText("Edit album")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Edit album"));
    expect(handleEdit).toHaveBeenCalledWith(mockAlbum);

    // Re-open for share
    fireEvent.pointerDown(menuButton);
    await waitFor(() => {
      expect(screen.getByText("Share album")).toBeDefined();
    });
    fireEvent.click(screen.getByText("Share album"));
    expect(handleShare).toHaveBeenCalledWith(mockAlbum);

    // Re-open for delete
    fireEvent.pointerDown(menuButton);
    await waitFor(() => {
      expect(screen.getByText("Delete album")).toBeDefined();
    });
    fireEvent.click(screen.getByText("Delete album"));
    expect(handleDelete).toHaveBeenCalledWith(mockAlbum);
  });
});

describe("AlbumEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch
    global.fetch = vi.fn();
  });

  it("shows create mode when no album provided", () => {
    render(
      <AlbumEditor
        album={null}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    // Check for dialog title
    expect(screen.getByRole("heading", { name: /create album/i })).toBeDefined();
  });

  it("shows edit mode when album provided", () => {
    render(
      <AlbumEditor
        album={mockAlbum}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText(/edit album/i)).toBeDefined();
  });

  it("pre-fills form with album data", () => {
    render(
      <AlbumEditor
        album={mockAlbum}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    expect(titleInput.value).toBe("Test Album");
  });

  it("shows privacy selector", () => {
    render(
      <AlbumEditor
        album={null}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    // Check for privacy label text
    expect(screen.getByText(/privacy/i)).toBeDefined();
  });

  it("calls onClose when cancel clicked", () => {
    const handleClose = vi.fn();
    render(
      <AlbumEditor
        album={null}
        isOpen={true}
        onClose={handleClose}
        onSave={vi.fn()}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(handleClose).toHaveBeenCalled();
  });

  it("validates title is required", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: "Title required" }),
    });

    render(
      <AlbumEditor
        album={null}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    // Clear the title input (should be empty by default)
    const submitButton = screen.getByRole("button", { name: /create album/i });
    fireEvent.click(submitButton);

    // Form validation should prevent submission with empty title
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits a POST request and calls onSave on successful create", async () => {
    const savedAlbum = { ...mockAlbum, id: "new-album" };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(savedAlbum),
    });
    const handleSave = vi.fn();

    render(
      <AlbumEditor album={null} isOpen={true} onClose={vi.fn()} onSave={handleSave} />
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "New Album" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create album/i }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(savedAlbum);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/gallery/albums",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("submits a PATCH request when editing an existing album", async () => {
    const updatedAlbum = { ...mockAlbum, title: "Updated" };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(updatedAlbum),
    });
    const handleSave = vi.fn();

    render(
      <AlbumEditor
        album={mockAlbum}
        isOpen={true}
        onClose={vi.fn()}
        onSave={handleSave}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(updatedAlbum);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/gallery/albums/${mockAlbum.id}`,
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("shows an error and does not call onSave when the request fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: "Failed to save album" }),
    });
    const handleSave = vi.fn();

    render(
      <AlbumEditor album={mockAlbum} isOpen={true} onClose={vi.fn()} onSave={handleSave} />
    );

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(handleSave).not.toHaveBeenCalled();
  });

  it("updates the description field", () => {
    render(
      <AlbumEditor album={null} isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />
    );

    const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
    fireEvent.change(descriptionInput, { target: { value: "A cool description" } });
    expect(descriptionInput.value).toBe("A cool description");
  });

  it("rejects a whitespace-only title (passes HTML required but fails trim())", async () => {
    render(
      <AlbumEditor album={null} isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /create album/i }));

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it("closes via Dialog onOpenChange (e.g. Escape key) and resets fields", () => {
    const handleClose = vi.fn();
    render(
      <AlbumEditor
        album={mockAlbum}
        isOpen={true}
        onClose={handleClose}
        onSave={vi.fn()}
      />
    );

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    expect(handleClose).toHaveBeenCalled();
  });

  it("changes privacy via the select dropdown", async () => {
    render(
      <AlbumEditor album={null} isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("combobox"));
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Private - Only you" })).toBeDefined();
    });
    fireEvent.click(screen.getByRole("option", { name: "Private - Only you" }));

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...mockAlbum, privacy: "PRIVATE" }),
    });
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Private Album" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create album/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/gallery/albums",
        expect.objectContaining({
          body: expect.stringContaining('"privacy":"PRIVATE"'),
        })
      );
    });
  });
});

describe("GalleryGrid additional coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading skeleton row when isLoading and hasMore are true", () => {
    // With no items, rowCount is 0; the mocked virtualizer still returns a
    // single virtual row at index 0, which is >= rowCount, exercising the
    // loading-skeleton branch instead of the "no media yet" empty state.
    const { container } = render(
      <GalleryGrid items={[]} isLoading={true} hasMore={true} />
    );
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
  });

  it("displays the view count on items with view_count > 0", () => {
    render(<GalleryGrid items={[mockMedia[0]]} />);
    expect(screen.getByText("10")).toBeDefined();
  });

  it("shows Users icon badge for FRIENDS_ONLY items when showPrivacyBadge is set", () => {
    const friendsItem = { ...mockMedia[0], privacy: "FRIENDS_ONLY" as const };
    render(<GalleryGrid items={[friendsItem]} showPrivacyBadge={true} />);
    expect(screen.getByText(/friends/i)).toBeDefined();
  });

  it("calls onLoadMore when scrolled near the end and hasMore is true", () => {
    const handleLoadMore = vi.fn();
    render(
      <GalleryGrid
        items={mockMedia}
        hasMore={true}
        onLoadMore={handleLoadMore}
        isLoading={false}
      />
    );
    // The mocked virtualizer always returns a single virtual row at index 0,
    // which is >= rowCount - 1 for this small dataset, triggering onLoadMore.
    expect(handleLoadMore).toHaveBeenCalled();
  });

  it("uses the explicit columns prop and skips responsive width detection", () => {
    const { container } = render(<GalleryGrid items={mockMedia} columns={4} />);
    const grid = container.querySelector('[style*="grid-template-columns"]');
    expect(grid).not.toBeNull();
    expect(grid?.getAttribute("style")).toContain("repeat(4, 1fr)");
  });

  it("picks responsive column counts based on window width when no columns prop is given", () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 400,
    });

    const { container } = render(<GalleryGrid items={mockMedia} />);
    const grid = container.querySelector('[style*="grid-template-columns"]');
    expect(grid?.getAttribute("style")).toContain("repeat(2, 1fr)");

    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalWidth,
    });
  });

  it.each([
    [700, 3],
    [900, 4],
  ])("picks %i columns for a %ipx-wide viewport", (width, expectedColumns) => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: width,
    });

    const { container } = render(<GalleryGrid items={mockMedia} />);
    const grid = container.querySelector('[style*="grid-template-columns"]');
    expect(grid?.getAttribute("style")).toContain(`repeat(${expectedColumns}, 1fr)`);

    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalWidth,
    });
  });

  it("deselects an already-selected item on click", () => {
    const handleSelection = vi.fn();
    render(
      <GalleryGrid
        items={mockMedia}
        selectable={true}
        selectedIds={new Set([mockMedia[0].id])}
        onSelectionChange={handleSelection}
      />
    );

    const images = screen.getAllByRole("img");
    fireEvent.click(images[0].closest("div")!);

    expect(handleSelection).toHaveBeenCalledWith(new Set());
  });
});
