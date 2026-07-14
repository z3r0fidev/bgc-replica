import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeedItem } from "../../src/components/feed/feed-item";
import { useGestures } from "../../src/hooks/useGestures";
import type { FeedPost } from "../../src/types/feed";

vi.mock("@/hooks/useGestures", () => ({
  useGestures: vi.fn(),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: "p1",
    author_id: "author-1234567890",
    content: "Hello, this is a post",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("FeedItem", () => {
  beforeEach(() => {
    vi.mocked(useGestures).mockReturnValue({
      controls: {} as never,
      swipeDirection: null,
      handleDragEnd: vi.fn(),
      resetSwipe: vi.fn(),
    });
  });

  it("renders author info and content", () => {
    render(<FeedItem post={makePost()} />);
    expect(screen.getByText("User author-1")).toBeDefined();
    expect(screen.getByText("Hello, this is a post")).toBeDefined();
    expect(screen.getByText("AU")).toBeDefined(); // avatar fallback initials
  });

  it("does not render an image when image_url is absent", () => {
    render(<FeedItem post={makePost()} />);
    expect(screen.queryByAltText("Attachment")).toBeNull();
  });

  it("renders an image when image_url is present", () => {
    render(<FeedItem post={makePost({ image_url: "https://cdn.example.com/photo.jpg" })} />);
    const img = screen.getByAltText("Attachment") as HTMLImageElement;
    expect(img.src).toBe("https://cdn.example.com/photo.jpg");
  });

  it("renders Like, Comment, and Share actions", () => {
    render(<FeedItem post={makePost()} />);
    expect(screen.getByRole("button", { name: "Like post" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Comment on post" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Share post" })).toBeDefined();
  });

  it("applies a green tint when swipeDirection is 'right'", () => {
    vi.mocked(useGestures).mockReturnValue({
      controls: {} as never,
      swipeDirection: "right",
      handleDragEnd: vi.fn(),
      resetSwipe: vi.fn(),
    });
    const { container } = render(<FeedItem post={makePost()} />);
    const card = container.querySelector('[data-slot="card"]')!;
    expect(card.className).toContain("bg-green-50/50");
  });

  it("applies a red tint when swipeDirection is 'left'", () => {
    vi.mocked(useGestures).mockReturnValue({
      controls: {} as never,
      swipeDirection: "left",
      handleDragEnd: vi.fn(),
      resetSwipe: vi.fn(),
    });
    const { container } = render(<FeedItem post={makePost()} />);
    const card = container.querySelector('[data-slot="card"]')!;
    expect(card.className).toContain("bg-red-50/50");
  });

  it("applies neither tint when swipeDirection is null", () => {
    const { container } = render(<FeedItem post={makePost()} />);
    const card = container.querySelector('[data-slot="card"]')!;
    expect(card.className).not.toContain("bg-green-50/50");
    expect(card.className).not.toContain("bg-red-50/50");
  });
});
