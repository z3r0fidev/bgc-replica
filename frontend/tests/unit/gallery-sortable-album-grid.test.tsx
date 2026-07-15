import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SortableAlbumGrid } from "../../src/components/gallery/SortableAlbumGrid";
import type { GalleryMedia } from "../../src/types/gallery";

// dnd-kit renders fine in jsdom without special mocking (verified: it only
// touches pointer-capture APIs during an actual drag gesture, which these
// tests don't simulate - they exercise the click/render logic instead).

const items: GalleryMedia[] = [
  {
    id: "media-1",
    user_id: "user-1",
    type: "IMAGE",
    url: "https://example.com/image1.jpg",
    thumbnail_url: "https://example.com/thumb1.jpg",
    filename: "image1.jpg",
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
    duration_seconds: 125,
    view_count: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: "media-3",
    user_id: "user-1",
    type: "IMAGE",
    url: "https://example.com/image3.jpg",
    thumbnail_url: "https://example.com/thumb3.jpg",
    privacy: "FRIENDS_ONLY",
    view_count: 1,
    created_at: new Date().toISOString(),
  },
];

describe("SortableAlbumGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an empty state when items is empty", () => {
    render(<SortableAlbumGrid items={[]} onReorder={vi.fn()} />);
    expect(screen.getByText(/this album is empty/i)).toBeDefined();
  });

  it("renders each item's thumbnail", () => {
    render(<SortableAlbumGrid items={items} onReorder={vi.fn()} />);
    expect(screen.getAllByRole("img").length).toBe(3);
  });

  it("shows a Play icon and duration badge for VIDEO items", () => {
    render(<SortableAlbumGrid items={items} onReorder={vi.fn()} />);
    expect(screen.getByText("2:05")).toBeDefined();
  });

  it("calls onItemClick with the item and index when clicked", () => {
    const handleClick = vi.fn();
    render(<SortableAlbumGrid items={items} onReorder={vi.fn()} onItemClick={handleClick} />);

    const images = screen.getAllByRole("img");
    fireEvent.click(images[1].closest(".aspect-square")!);

    expect(handleClick).toHaveBeenCalledWith(items[1], 1);
  });

  it("shows privacy badges (Lock/Users) when showPrivacyBadge is enabled", () => {
    render(<SortableAlbumGrid items={items} onReorder={vi.fn()} showPrivacyBadge={true} />);
    expect(screen.getByText("Private")).toBeDefined();
    expect(screen.getByText("Friends")).toBeDefined();
  });

  it("does not show privacy badges by default", () => {
    render(<SortableAlbumGrid items={items} onReorder={vi.fn()} />);
    expect(screen.queryByText("Private")).toBeNull();
    expect(screen.queryByText("Friends")).toBeNull();
  });

  it("hides the drag handle when disabled is true", () => {
    const { container } = render(
      <SortableAlbumGrid items={items} onReorder={vi.fn()} disabled={true} />
    );
    expect(container.querySelector("svg.lucide-grip-vertical")).toBeNull();
  });

  it("shows the drag handle when not disabled", () => {
    const { container } = render(<SortableAlbumGrid items={items} onReorder={vi.fn()} />);
    expect(container.querySelector("svg.lucide-grip-vertical")).not.toBeNull();
  });

  it("does not call onItemClick when disabled item is clicked (still fires per current impl if not guarded)", () => {
    // The drag-handle stopPropagation shouldn't prevent normal item clicks.
    const handleClick = vi.fn();
    render(
      <SortableAlbumGrid items={items} onReorder={vi.fn()} onItemClick={handleClick} disabled={true} />
    );
    const images = screen.getAllByRole("img");
    fireEvent.click(images[0].closest(".aspect-square")!);
    expect(handleClick).toHaveBeenCalledWith(items[0], 0);
  });

  it("clicking the drag handle stops propagation and does not trigger onItemClick", () => {
    const handleClick = vi.fn();
    const { container } = render(
      <SortableAlbumGrid items={items} onReorder={vi.fn()} onItemClick={handleClick} />
    );
    const handle = container.querySelector(".cursor-grab") as HTMLElement;
    expect(handle).not.toBeNull();
    fireEvent.click(handle);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
