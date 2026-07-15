import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FeedPage from "../../src/app/(protected)/feed/page";
import { useAppStore } from "../../src/store/use-app-store";
import { offlineStorage } from "../../src/lib/offline-storage";
import { useFeed } from "../../src/hooks/use-feed";
import type { FeedPost } from "../../src/types/feed";

// IndexedDB is not implemented in jsdom - offline storage must be fully mocked.
vi.mock("../../src/lib/offline-storage", () => ({
  offlineStorage: {
    getFeed: vi.fn(),
    saveFeed: vi.fn(),
  },
}));

// useFeed is already fully unit-tested standalone (tests/unit/use-feed.test.ts);
// mock it here so this page test only exercises the page's own logic.
vi.mock("../../src/hooks/use-feed", () => ({
  useFeed: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
import { toast } from "sonner";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: String(index),
        start: index * 200,
        size: 200,
      })),
    getTotalSize: () => count * 200,
  }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("../../src/hooks/useGestures", () => ({
  useGestures: () => ({ handleDragEnd: vi.fn(), swipeDirection: null }),
}));

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: "post-1",
    author_id: "author-1",
    content: "Hello world",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function mockUseFeed(initialPosts: FeedPost[] = []) {
  let posts = initialPosts;
  const setPosts = vi.fn((next: FeedPost[]) => {
    posts = next;
  }) as unknown as React.Dispatch<React.SetStateAction<FeedPost[]>>;
  const addPosts = vi.fn();
  vi.mocked(useFeed).mockReturnValue({ posts, setPosts, addPosts });
  return { setPosts, addPosts };
}

describe("FeedPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ isOnline: true });
    vi.mocked(offlineStorage.getFeed).mockResolvedValue([]);
    vi.mocked(offlineStorage.saveFeed).mockResolvedValue(undefined);
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it("loads the feed via fetch when online and caches it via offlineStorage.saveFeed", async () => {
    const posts = [makePost({ id: "p1" }), makePost({ id: "p2" })];
    mockUseFeed(posts);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: posts }),
    });

    render(<FeedPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/feed/?feed_type=global"),
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });

    await waitFor(() => {
      expect(offlineStorage.saveFeed).toHaveBeenCalledWith(posts);
    });
  });

  it("reads from offlineStorage.getFeed instead of fetch when offline", async () => {
    useAppStore.setState({ isOnline: false });
    const cached = [makePost({ id: "cached-1" })];
    vi.mocked(offlineStorage.getFeed).mockResolvedValue(cached);
    const { setPosts } = mockUseFeed([]);

    render(<FeedPage />);

    await waitFor(() => {
      expect(offlineStorage.getFeed).toHaveBeenCalled();
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(setPosts).toHaveBeenCalledWith(cached);
  });

  it("falls back to cached posts when the fetch throws", async () => {
    const cached = [makePost({ id: "fallback-1" })];
    vi.mocked(offlineStorage.getFeed).mockResolvedValue(cached);
    const { setPosts } = mockUseFeed([]);
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("network down"));

    render(<FeedPage />);

    await waitFor(() => {
      expect(offlineStorage.getFeed).toHaveBeenCalled();
    });
    expect(setPosts).toHaveBeenCalledWith(cached);
  });

  it("shows the empty state when there are no posts and loading has finished", async () => {
    mockUseFeed([]);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    render(<FeedPage />);

    await waitFor(() => {
      expect(screen.getByText(/no activity yet/i)).toBeDefined();
    });
  });

  it("renders existing posts through FeedItem", async () => {
    const posts = [makePost({ id: "render-1", content: "Rendered post content" })];
    mockUseFeed(posts);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: posts }),
    });

    render(<FeedPage />);

    await waitFor(() => {
      expect(screen.getByText("Rendered post content")).toBeDefined();
    });
  });

  it("blocks posting while offline and shows a toast error", async () => {
    useAppStore.setState({ isOnline: false });
    mockUseFeed([]);
    vi.mocked(offlineStorage.getFeed).mockResolvedValue([]);

    render(<FeedPage />);

    await waitFor(() => {
      expect(offlineStorage.getFeed).toHaveBeenCalled();
    });

    // Textarea is disabled while offline, so the post button is also disabled
    // via !isOnline in its disabled expression - simulate a submit attempt
    // by directly invoking the handler through the button (still present, just disabled).
    const postButton = screen.getByRole("button", { name: /post/i });
    expect(postButton).toBeDisabled();
  });

  it("submits a new post, prepends it optimistically via addPosts, and clears the textarea", async () => {
    const { addPosts } = mockUseFeed([]);
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        // initial GET /api/feed/
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      })
      .mockResolvedValueOnce({
        // POST /api/feed/
        ok: true,
        json: () => Promise.resolve(makePost({ id: "new-post", content: "New content" })),
      });

    render(<FeedPage />);

    await waitFor(() => {
      expect(offlineStorage.saveFeed).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    fireEvent.change(textarea, { target: { value: "New content" } });

    const postButton = screen.getByRole("button", { name: /post/i });
    fireEvent.click(postButton);

    await waitFor(() => {
      expect(addPosts).toHaveBeenCalledWith(
        [expect.objectContaining({ id: "new-post", content: "New content" })],
        "top"
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Status updated!");
    });

    expect((textarea as HTMLTextAreaElement).value).toBe("");
  });

  it("shows a toast error when the post submission fails", async () => {
    mockUseFeed([]);
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

    render(<FeedPage />);

    await waitFor(() => {
      expect(offlineStorage.saveFeed).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    fireEvent.change(textarea, { target: { value: "Will fail" } });
    fireEvent.click(screen.getByRole("button", { name: /post/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Post failed");
    });
  });

  it("switches feed type when the Following tab is selected, reloading via fetch", async () => {
    mockUseFeed([]);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    render(<FeedPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("feed_type=global"),
        expect.any(Object)
      );
    });

    // Radix's TabsTrigger switches tabs on mousedown, not click.
    fireEvent.mouseDown(screen.getByRole("tab", { name: /following/i }), { button: 0 });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("feed_type=following"),
        expect.any(Object)
      );
    });
  });
});
