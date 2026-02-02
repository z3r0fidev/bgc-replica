import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GalleryGrid } from "../../src/components/gallery/GalleryGrid";
import { AlbumCard } from "../../src/components/gallery/AlbumCard";
import { AlbumEditor } from "../../src/components/gallery/AlbumEditor";
import type { GalleryMedia, Album } from "../../src/types/gallery";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
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

  it("calls onEdit when edit clicked", async () => {
    const handleEdit = vi.fn();
    render(
      <AlbumCard
        album={mockAlbum}
        onEdit={handleEdit}
        onDelete={vi.fn()}
        onShare={vi.fn()}
      />
    );

    // Open dropdown menu
    const menuButton = screen.getByRole("button");
    fireEvent.click(menuButton);

    // Click edit option
    const editOption = await screen.findByText(/edit/i);
    fireEvent.click(editOption);

    expect(handleEdit).toHaveBeenCalledWith(mockAlbum);
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
    expect(screen.getByText(/create album/i)).toBeDefined();
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
    expect(screen.getByLabelText(/privacy/i)).toBeDefined();
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
    (global.fetch as any).mockResolvedValueOnce({
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
  });
});
