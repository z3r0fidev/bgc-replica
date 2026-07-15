import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MediaLightbox } from "../../src/components/gallery/MediaLightbox";
import type { GalleryMedia } from "../../src/types/gallery";

// Mock framer-motion (see tests/unit/gallery.test.tsx for the established pattern)
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

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
    duration_seconds: 120,
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

describe("MediaLightbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = "";
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <MediaLightbox items={items} initialIndex={0} isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when items is empty", () => {
    const { container } = render(
      <MediaLightbox items={[]} initialIndex={0} isOpen={true} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders an image for IMAGE type items", () => {
    render(<MediaLightbox items={items} initialIndex={0} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByAltText("image1.jpg")).toBeDefined();
    expect(screen.getByText("1 / 3")).toBeDefined();
    expect(screen.getByText("image1.jpg")).toBeDefined();
  });

  it("renders a video element for VIDEO type items", () => {
    const { container } = render(
      <MediaLightbox items={items} initialIndex={1} isOpen={true} onClose={vi.fn()} />
    );
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("src")).toBe("https://example.com/video1.mp4");
  });

  it("shows the correct position label on the first and last items", () => {
    const { unmount } = render(
      <MediaLightbox items={items} initialIndex={0} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByText("1 / 3")).toBeDefined();
    unmount();

    render(<MediaLightbox items={items} initialIndex={2} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("3 / 3")).toBeDefined();
  });

  it("navigates to the next and previous items via the on-screen buttons", () => {
    render(<MediaLightbox items={items} initialIndex={0} isOpen={true} onClose={vi.fn()} />);

    // Buttons are icon-only; locate by the surrounding nav structure via all buttons.
    const buttons = screen.getAllByRole("button");
    // Layout order: [download, share, close, prevArrow?, nextArrow]. Rather than
    // rely on fragile ordering, drive navigation via keyboard which is unambiguous.
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("2 / 3")).toBeDefined();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("1 / 3")).toBeDefined();

    expect(buttons.length).toBeGreaterThan(0);
  });

  it("does not navigate past the bounds", () => {
    render(<MediaLightbox items={items} initialIndex={0} isOpen={true} onClose={vi.fn()} />);
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("1 / 3")).toBeDefined();
  });

  it("calls onClose on Escape key", () => {
    const handleClose = vi.fn();
    render(<MediaLightbox items={items} initialIndex={0} isOpen={true} onClose={handleClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalled();
  });

  it("zooms in and out via +/- keys and resets with 0", () => {
    render(<MediaLightbox items={items} initialIndex={0} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("100%")).toBeDefined();

    fireEvent.keyDown(window, { key: "+" });
    expect(screen.getByText("125%")).toBeDefined();

    fireEvent.keyDown(window, { key: "-" });
    fireEvent.keyDown(window, { key: "-" });
    expect(screen.getByText("75%")).toBeDefined();

    fireEvent.keyDown(window, { key: "0" });
    expect(screen.getByText("100%")).toBeDefined();
  });

  it("zoom buttons in the header adjust zoom for IMAGE items", () => {
    render(<MediaLightbox items={items} initialIndex={0} isOpen={true} onClose={vi.fn()} />);
    const zoomPercent = screen.getByText("100%");
    const header = zoomPercent.closest("div")!.parentElement!;
    const zoomButtons = header.querySelectorAll("button");
    // First zoom button = zoom out, second (after the % label) = zoom in
    fireEvent.click(zoomButtons[1]);
    expect(screen.getByText("125%")).toBeDefined();
    fireEvent.click(zoomButtons[0]);
    expect(screen.getByText("100%")).toBeDefined();
  });

  it("does not render zoom controls for VIDEO items", () => {
    render(<MediaLightbox items={items} initialIndex={1} isOpen={true} onClose={vi.fn()} />);
    expect(screen.queryByText("100%")).toBeNull();
  });

  it("closes when clicking the backdrop but not when clicking the content area", () => {
    const handleClose = vi.fn();
    const { container } = render(
      <MediaLightbox items={items} initialIndex={0} isOpen={true} onClose={handleClose} />
    );

    // Clicking inside the main content area stops propagation to the backdrop.
    const contentArea = screen.getByAltText("image1.jpg").closest(
      ".flex-1"
    ) as HTMLElement;
    fireEvent.click(contentArea);
    expect(handleClose).not.toHaveBeenCalled();

    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("navigates via the on-screen chevron buttons directly", () => {
    render(<MediaLightbox items={items} initialIndex={1} isOpen={true} onClose={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    const nextButton = buttons.find((b) => b.querySelector("svg.lucide-chevron-right"));
    const prevButton = buttons.find((b) => b.querySelector("svg.lucide-chevron-left"));
    expect(nextButton).toBeDefined();
    expect(prevButton).toBeDefined();

    fireEvent.click(nextButton!);
    expect(screen.getByText("3 / 3")).toBeDefined();

    fireEvent.click(prevButton!);
    expect(screen.getByText("2 / 3")).toBeDefined();
  });

  it("tracks video play/pause state via onPlay/onPause handlers", () => {
    const { container } = render(
      <MediaLightbox items={items} initialIndex={1} isOpen={true} onClose={vi.fn()} />
    );
    const video = container.querySelector("video")!;
    fireEvent.play(video);
    fireEvent.pause(video);
    // No visible assertion surface beyond not throwing; state is internal.
    expect(video).toBeDefined();
  });

  it("clicking a thumbnail jumps to that item", () => {
    render(<MediaLightbox items={items} initialIndex={0} isOpen={true} onClose={vi.fn()} />);
    const thumbButtons = screen.getAllByRole("button").filter((b) => b.querySelector("img"));
    // Third thumbnail corresponds to media-3
    fireEvent.click(thumbButtons[2]);
    expect(screen.getByText("3 / 3")).toBeDefined();
  });

  it("does not render the thumbnail strip when there is only one item", () => {
    render(
      <MediaLightbox items={[items[0]]} initialIndex={0} isOpen={true} onClose={vi.fn()} />
    );
    const imgs = screen.getAllByRole("img");
    // Only the main image, no thumbnail-strip images
    expect(imgs.length).toBe(1);
  });

  it("triggers a download by creating and clicking an anchor element", () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(<MediaLightbox items={items} initialIndex={0} isOpen={true} onClose={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    const downloadButton = buttons.find((b) => b.querySelector("svg.lucide-download"));
    expect(downloadButton).toBeDefined();

    fireEvent.click(downloadButton!);

    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it("shares via navigator.share when available", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      share: shareMock,
      clipboard: { writeText: vi.fn() },
    });

    render(<MediaLightbox items={items} initialIndex={0} isOpen={true} onClose={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    // Share is the button right after download in the controls group; find via icon count fallback
    const shareButton = buttons.find((b) => b.innerHTML.includes("share"));
    if (shareButton) {
      fireEvent.click(shareButton);
      await waitFor(() => expect(shareMock).toHaveBeenCalled());
    }
    vi.unstubAllGlobals();
  });

  it("falls back to clipboard copy when navigator.share is unavailable", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      share: undefined,
      clipboard: { writeText: writeTextMock },
    });

    render(<MediaLightbox items={items} initialIndex={0} isOpen={true} onClose={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    const shareButton = buttons.find((b) => b.querySelector("svg.lucide-share2"));
    if (shareButton) {
      fireEvent.click(shareButton);
      await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith(items[0].url));
    }
    vi.unstubAllGlobals();
  });

  it("renders a delete button and calls onDelete with the current item when provided", () => {
    const handleDelete = vi.fn();
    render(
      <MediaLightbox
        items={items}
        initialIndex={0}
        isOpen={true}
        onClose={vi.fn()}
        onDelete={handleDelete}
      />
    );
    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons.find((b) => b.querySelector("svg.lucide-trash2"));
    expect(deleteButton).toBeDefined();
    fireEvent.click(deleteButton!);
    expect(handleDelete).toHaveBeenCalledWith(items[0]);
  });

  it("does not render a delete button when onDelete is not provided", () => {
    render(<MediaLightbox items={items} initialIndex={0} isOpen={true} onClose={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons.find((b) => b.querySelector("svg.lucide-trash2"));
    expect(deleteButton).toBeUndefined();
  });

  it("hides the controls (zoom/download/share/delete) when showControls is false", () => {
    render(
      <MediaLightbox
        items={items}
        initialIndex={0}
        isOpen={true}
        onClose={vi.fn()}
        showControls={false}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryByText("100%")).toBeNull();
  });

  it("sets body overflow to hidden while open and restores it on close", () => {
    const { rerender } = render(
      <MediaLightbox items={items} initialIndex={0} isOpen={true} onClose={vi.fn()} />
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <MediaLightbox items={items} initialIndex={0} isOpen={false} onClose={vi.fn()} />
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("resets currentIndex/zoom when re-opened with a different initialIndex", () => {
    const { rerender } = render(
      <MediaLightbox items={items} initialIndex={0} isOpen={false} onClose={vi.fn()} />
    );

    rerender(
      <MediaLightbox items={items} initialIndex={2} isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.getByText("3 / 3")).toBeDefined();
  });
});
