import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { SortableAlbumGrid } from "../../src/components/gallery/SortableAlbumGrid";
import type { GalleryMedia } from "../../src/types/gallery";

// Faithfully simulating a real pointer/keyboard drag gesture through dnd-kit
// in jsdom (which lacks layout measurement + pointer capture) is impractical.
// Per the task guidance, we instead mock @dnd-kit's core/sortable/utilities
// modules to capture the onDragStart/onDragEnd callbacks SortableAlbumGrid
// wires up, and invoke them directly - this exercises the component's own
// reorder logic (arrayMove + onReorder) and its DragOverlay rendering branch
// without needing to fake a real drag gesture.
let capturedOnDragStart: ((event: { active: { id: string } }) => void) | undefined;
let capturedOnDragEnd:
  | ((event: { active: { id: string }; over: { id: string } | null }) => void)
  | undefined;

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    onDragStart,
    onDragEnd,
  }: React.PropsWithChildren<{
    onDragStart: typeof capturedOnDragStart;
    onDragEnd: typeof capturedOnDragEnd;
  }>) => {
    capturedOnDragStart = onDragStart;
    capturedOnDragEnd = onDragEnd;
    return <>{children}</>;
  },
  DragOverlay: ({ children }: React.PropsWithChildren) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/sortable", () => ({
  arrayMove: <T,>(arr: T[], from: number, to: number) => {
    const copy = [...arr];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    return copy;
  },
  SortableContext: ({ children }: React.PropsWithChildren) => <>{children}</>,
  sortableKeyboardCoordinates: vi.fn(),
  rectSortingStrategy: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

const items: GalleryMedia[] = [
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
    duration_seconds: 60,
    view_count: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: "media-3",
    user_id: "user-1",
    type: "IMAGE",
    url: "https://example.com/image3.jpg",
    thumbnail_url: "https://example.com/thumb3.jpg",
    privacy: "PUBLIC",
    view_count: 1,
    created_at: new Date().toISOString(),
  },
];

describe("SortableAlbumGrid drag handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnDragStart = undefined;
    capturedOnDragEnd = undefined;
  });

  it("calls onReorder with the array moved from the active index to the over index", () => {
    const handleReorder = vi.fn();
    render(<SortableAlbumGrid items={items} onReorder={handleReorder} />);

    expect(capturedOnDragEnd).toBeDefined();
    capturedOnDragEnd!({ active: { id: "media-1" }, over: { id: "media-3" } });

    expect(handleReorder).toHaveBeenCalledWith([items[1], items[2], items[0]]);
  });

  it("does not call onReorder when dropped with no over target", () => {
    const handleReorder = vi.fn();
    render(<SortableAlbumGrid items={items} onReorder={handleReorder} />);

    capturedOnDragEnd!({ active: { id: "media-1" }, over: null });

    expect(handleReorder).not.toHaveBeenCalled();
  });

  it("does not call onReorder when dropped on itself", () => {
    const handleReorder = vi.fn();
    render(<SortableAlbumGrid items={items} onReorder={handleReorder} />);

    capturedOnDragEnd!({ active: { id: "media-1" }, over: { id: "media-1" } });

    expect(handleReorder).not.toHaveBeenCalled();
  });

  it("renders the dragged item's overlay after onDragStart, and clears it after onDragEnd", () => {
    render(<SortableAlbumGrid items={items} onReorder={vi.fn()} />);

    expect(screen.getByTestId("drag-overlay").firstChild).toBeNull();

    act(() => {
      capturedOnDragStart!({ active: { id: "media-2" } });
    });
    const overlay = screen.getByTestId("drag-overlay");
    expect(overlay.querySelector('img[alt="Gallery item"]')).not.toBeNull();
    // VIDEO overlay renders a Play icon
    expect(overlay.querySelector("svg.lucide-play")).not.toBeNull();

    act(() => {
      capturedOnDragEnd!({ active: { id: "media-2" }, over: null });
    });
    expect(screen.getByTestId("drag-overlay").firstChild).toBeNull();
  });
});
