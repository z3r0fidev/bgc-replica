import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForumPage from "../../src/app/(forums)/forums/[...slug]/page";
import { forumsService, type ForumCategoryTree, type ForumThread } from "../../src/services/forums";

const mockUseParams = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
}));

vi.mock("@/services/forums", () => ({
  forumsService: {
    getTree: vi.fn(),
    getThreads: vi.fn(),
  },
}));

vi.mock("@/components/forums/thread-list", () => ({
  ThreadList: (props: {
    threads: ForumThread[];
    hasNext: boolean;
    isLoading: boolean;
    onLoadMore: () => void;
  }) => (
    <div data-testid="thread-list">
      <span data-testid="thread-count">{props.threads.length}</span>
      <span data-testid="has-next">{String(props.hasNext)}</span>
      <span data-testid="is-loading">{String(props.isLoading)}</span>
      <button onClick={props.onLoadMore}>load more</button>
    </div>
  ),
}));

vi.mock("@/components/forums/breadcrumbs", () => ({
  ForumBreadcrumbs: () => <div data-testid="breadcrumbs" />,
}));

vi.mock("@/components/forums/stats", () => ({
  ForumStats: (props: { forumId: string }) => (
    <div data-testid="forum-stats">{props.forumId}</div>
  ),
}));

vi.mock("@/components/forums/create-thread-fab", () => ({
  CreateThreadFAB: () => <div data-testid="create-thread-fab" />,
}));

function makeTree(): ForumCategoryTree[] {
  return [
    {
      id: "cat-1",
      name: "General",
      slug: "general",
      parent_id: null,
      description: "General discussion",
      children: [
        {
          id: "cat-2",
          name: "Announcements",
          slug: "announcements",
          parent_id: "cat-1",
          description: "Official news",
          children: [],
        },
      ],
    },
  ];
}

function makeThread(overrides: Partial<ForumThread> = {}): ForumThread {
  return {
    id: "t1",
    title: "Hello world",
    author: { name: "Alice" },
    stats: { replies: 1, views: 5 },
    last_post: { user: { name: "Bob" }, created_at: "2026-01-01T00:00:00Z" },
    is_sticky: false,
    is_hot: false,
    ...overrides,
  };
}

describe("ForumPage (catch-all slug route)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ slug: ["general"] });
  });

  it("loads the tree and threads for the last slug segment on mount", async () => {
    vi.mocked(forumsService.getTree).mockResolvedValue(makeTree());
    vi.mocked(forumsService.getThreads).mockResolvedValue({
      items: [makeThread()],
      has_more: false,
      next_cursor: undefined,
    });

    render(<ForumPage />);

    await waitFor(() => {
      expect(screen.getByTestId("thread-count").textContent).toBe("1");
    });
    expect(forumsService.getThreads).toHaveBeenCalledWith("general", {
      cursor: undefined,
      limit: 20,
    });
    expect(screen.getByText("general")).toBeDefined();
    expect(screen.getByText("General discussion")).toBeDefined();
  });

  it("resolves the active category from a nested slug path", async () => {
    mockUseParams.mockReturnValue({ slug: ["general", "announcements"] });
    vi.mocked(forumsService.getTree).mockResolvedValue(makeTree());
    vi.mocked(forumsService.getThreads).mockResolvedValue({
      items: [],
      has_more: false,
      next_cursor: undefined,
    });

    render(<ForumPage />);

    await waitFor(() => {
      expect(screen.getByTestId("forum-stats").textContent).toBe("cat-2");
    });
    expect(forumsService.getThreads).toHaveBeenCalledWith("announcements", {
      cursor: undefined,
      limit: 20,
    });
  });

  it("does not render ForumStats when the category cannot be found in the tree", async () => {
    mockUseParams.mockReturnValue({ slug: ["unknown-category"] });
    vi.mocked(forumsService.getTree).mockResolvedValue(makeTree());
    vi.mocked(forumsService.getThreads).mockResolvedValue({
      items: [],
      has_more: false,
      next_cursor: undefined,
    });

    render(<ForumPage />);

    await waitFor(() => {
      expect(screen.getByTestId("is-loading").textContent).toBe("false");
    });
    expect(screen.queryByTestId("forum-stats")).toBeNull();
  });

  it("appends threads and forwards the returned cursor when 'load more' is triggered", async () => {
    vi.mocked(forumsService.getTree).mockResolvedValue(makeTree());
    vi.mocked(forumsService.getThreads)
      .mockResolvedValueOnce({
        items: [makeThread({ id: "t1" })],
        has_more: true,
        next_cursor: "cursor-2",
      })
      .mockResolvedValueOnce({
        items: [makeThread({ id: "t2" })],
        has_more: false,
        next_cursor: undefined,
      });

    render(<ForumPage />);

    await waitFor(() => {
      expect(screen.getByTestId("thread-count").textContent).toBe("1");
    });
    expect(screen.getByTestId("has-next").textContent).toBe("true");

    fireEvent.click(screen.getByText("load more"));

    await waitFor(() => {
      expect(screen.getByTestId("thread-count").textContent).toBe("2");
    });
    expect(screen.getByTestId("has-next").textContent).toBe("false");
    expect(forumsService.getThreads).toHaveBeenNthCalledWith(2, "general", {
      cursor: "cursor-2",
      limit: 20,
    });
  });

  it("logs and recovers when fetching forum data fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(forumsService.getTree).mockRejectedValue(new Error("boom"));

    render(<ForumPage />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to fetch forum data:",
        expect.any(Error)
      );
    });
    expect(screen.getByTestId("thread-count").textContent).toBe("0");
    consoleSpy.mockRestore();
  });

  it("falls back to an empty slug when no slug params are present", async () => {
    mockUseParams.mockReturnValue({});
    vi.mocked(forumsService.getTree).mockResolvedValue([]);
    vi.mocked(forumsService.getThreads).mockResolvedValue({
      items: [],
      has_more: false,
      next_cursor: undefined,
    });

    render(<ForumPage />);

    await waitFor(() => {
      expect(forumsService.getThreads).toHaveBeenCalledWith("", {
        cursor: undefined,
        limit: 20,
      });
    });
  });

  it("skips recursion into a non-matching category that has no children, then finds the real match", async () => {
    mockUseParams.mockReturnValue({ slug: ["leaf-only"] });
    vi.mocked(forumsService.getTree).mockResolvedValue([
      {
        id: "childless-1",
        name: "Childless",
        slug: "some-other-slug",
        parent_id: null,
        description: "A category with no children array at all",
        children: undefined as unknown as ForumCategoryTree[],
      },
      {
        id: "leaf-1",
        name: "Leaf",
        slug: "leaf-only",
        parent_id: null,
        description: "The actual match",
        children: [],
      },
    ]);
    vi.mocked(forumsService.getThreads).mockResolvedValue({
      items: [],
      has_more: false,
      next_cursor: undefined,
    });

    render(<ForumPage />);

    await waitFor(() => {
      expect(screen.getByTestId("forum-stats").textContent).toBe("leaf-1");
    });
  });

  it("ignores a second fetch while one is already in flight", async () => {
    vi.mocked(forumsService.getTree).mockResolvedValue(makeTree());
    let resolveThreads: (v: {
      items: ForumThread[];
      has_more: boolean;
      next_cursor?: string;
    }) => void = () => {};
    vi.mocked(forumsService.getThreads).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveThreads = resolve;
        })
    );

    render(<ForumPage />);

    await waitFor(() => {
      expect(screen.getByTestId("is-loading").textContent).toBe("true");
    });

    // Triggering "load more" while the initial fetch is still in flight
    // should be a no-op (the isLoading guard short-circuits fetchData).
    fireEvent.click(screen.getByText("load more"));
    expect(forumsService.getThreads).toHaveBeenCalledTimes(1);

    resolveThreads({ items: [makeThread()], has_more: false, next_cursor: undefined });

    await waitFor(() => {
      expect(screen.getByTestId("is-loading").textContent).toBe("false");
    });
  });

  it("always renders the breadcrumbs and create-thread FAB", async () => {
    vi.mocked(forumsService.getTree).mockResolvedValue(makeTree());
    vi.mocked(forumsService.getThreads).mockResolvedValue({
      items: [],
      has_more: false,
      next_cursor: undefined,
    });

    render(<ForumPage />);

    expect(screen.getByTestId("breadcrumbs")).toBeDefined();
    expect(screen.getByTestId("create-thread-fab")).toBeDefined();
  });
});
