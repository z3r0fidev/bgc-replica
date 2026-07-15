import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForumsPage from "../../src/app/(protected)/forums/page";
import CategoryThreadsPage from "../../src/app/(protected)/forums/[category]/page";
import ThreadDetailPage from "../../src/app/(protected)/forums/thread/[id]/page";

const mockUseParams = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";

function mockFetchSequence(
  responses: Array<{ ok: boolean; status?: number; json?: unknown } | "reject">
) {
  const fn = vi.fn();
  for (const r of responses) {
    if (r === "reject") {
      fn.mockImplementationOnce(() => Promise.reject(new Error("network down")));
    } else {
      fn.mockImplementationOnce(() =>
        Promise.resolve({
          ok: r.ok,
          status: r.status ?? (r.ok ? 200 : 500),
          json: () => Promise.resolve(r.json),
        })
      );
    }
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe("ForumsPage (protected, raw fetch implementation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows a loading state before categories arrive", () => {
    mockFetchSequence([{ ok: true, json: [] }]);
    render(<ForumsPage />);
    expect(screen.getByText("Loading categories...")).toBeDefined();
  });

  it("renders categories returned by the API as links", async () => {
    mockFetchSequence([
      {
        ok: true,
        json: [
          { id: "c1", slug: "general", name: "General", description: "Talk about anything" },
        ],
      },
    ]);

    render(<ForumsPage />);

    await waitFor(() => {
      expect(screen.getByText("General")).toBeDefined();
    });
    expect(screen.getByText("Talk about anything")).toBeDefined();
    expect(screen.getByRole("link")).toHaveProperty(
      "href",
      expect.stringContaining("/forums/general")
    );
  });

  it("recovers gracefully when the categories fetch rejects", async () => {
    mockFetchSequence(["reject"]);

    render(<ForumsPage />);

    await waitFor(() => {
      expect(screen.queryByText("Loading categories...")).toBeNull();
    });
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows no categories when the request is not ok", async () => {
    mockFetchSequence([{ ok: false, json: [] }]);

    render(<ForumsPage />);

    await waitFor(() => {
      expect(screen.queryByText("Loading categories...")).toBeNull();
    });
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("CategoryThreadsPage (protected, raw fetch implementation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseParams.mockReturnValue({ category: "general" });
  });

  it("shows a loading state before threads arrive", () => {
    mockFetchSequence([{ ok: true, json: { items: [] } }]);
    render(<CategoryThreadsPage />);
    expect(screen.getByText("Loading threads...")).toBeDefined();
  });

  it("renders threads with author name, falling back to 'Unknown'", async () => {
    mockFetchSequence([
      {
        ok: true,
        json: {
          items: [
            {
              id: "t1",
              title: "First Thread",
              last_activity: "2026-01-01T00:00:00Z",
              author: { name: "Alice" },
            },
            {
              id: "t2",
              title: "Anonymous Thread",
              last_activity: "2026-01-02T00:00:00Z",
            },
          ],
        },
      },
    ]);

    render(<CategoryThreadsPage />);

    await waitFor(() => {
      expect(screen.getByText("First Thread")).toBeDefined();
    });
    expect(screen.getByText("Posted by Alice")).toBeDefined();
    expect(screen.getByText("Anonymous Thread")).toBeDefined();
    expect(screen.getByText("Posted by Unknown")).toBeDefined();

    const threadLink = screen.getByText("First Thread").closest("a");
    expect(threadLink).toHaveProperty(
      "href",
      expect.stringContaining("/forums/thread/t1")
    );
  });

  it("shows the empty state when there are no threads", async () => {
    mockFetchSequence([{ ok: true, json: { items: [] } }]);

    render(<CategoryThreadsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No threads found. Be the first to start a conversation!")
      ).toBeDefined();
    });
  });

  it("fetches from the category-specific endpoint using the route param", async () => {
    const fetchMock = mockFetchSequence([{ ok: true, json: { items: [] } }]);

    render(<CategoryThreadsPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/forums/categories/general/threads"),
        expect.any(Object)
      );
    });
  });

  it("recovers gracefully when the threads fetch rejects", async () => {
    mockFetchSequence(["reject"]);

    render(<CategoryThreadsPage />);

    await waitFor(() => {
      expect(screen.queryByText("Loading threads...")).toBeNull();
    });
    expect(
      screen.getByText("No threads found. Be the first to start a conversation!")
    ).toBeDefined();
  });

  it("shows the empty state when the threads request is not ok", async () => {
    mockFetchSequence([{ ok: false, json: {} }]);

    render(<CategoryThreadsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No threads found. Be the first to start a conversation!")
      ).toBeDefined();
    });
  });

  it("falls back to an empty thread list when the response has no items field", async () => {
    mockFetchSequence([{ ok: true, json: {} }]);

    render(<CategoryThreadsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No threads found. Be the first to start a conversation!")
      ).toBeDefined();
    });
  });
});

describe("ThreadDetailPage (protected, raw fetch implementation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseParams.mockReturnValue({ id: "thread-1" });
  });

  it("loads posts for the thread on mount", async () => {
    mockFetchSequence([
      {
        ok: true,
        json: [
          {
            id: "p1",
            author_id: "author-abcdef12",
            created_at: "2026-01-01T00:00:00Z",
            content: "Great post!",
          },
        ],
      },
    ]);

    render(<ThreadDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Great post!")).toBeDefined();
    });
    expect(screen.getByText(/User author-a/)).toBeDefined();
  });

  it("disables the post button when the reply text is empty", async () => {
    mockFetchSequence([{ ok: true, json: [] }]);
    render(<ThreadDetailPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole("button", { name: /post reply/i })).toHaveProperty(
      "disabled",
      true
    );
  });

  it("submits a reply, appends it to the list, clears the input, and toasts success", async () => {
    mockFetchSequence([
      { ok: true, json: [] },
      {
        ok: true,
        json: {
          id: "p2",
          author_id: "author-newpost1",
          created_at: "2026-01-02T00:00:00Z",
          content: "My new reply",
        },
      },
    ]);

    render(<ThreadDetailPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const textarea = screen.getByPlaceholderText("What are your thoughts?");
    fireEvent.change(textarea, { target: { value: "My new reply" } });

    fireEvent.click(screen.getByRole("button", { name: /post reply/i }));

    await waitFor(() => {
      expect(screen.getByText("My new reply")).toBeDefined();
    });
    expect(toast.success).toHaveBeenCalledWith("Reply posted!");
    expect((textarea as HTMLTextAreaElement).value).toBe("");
  });

  it("toasts an error message when the reply submission fails", async () => {
    mockFetchSequence([
      { ok: true, json: [] },
      { ok: false, json: {} },
    ]);

    render(<ThreadDetailPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const textarea = screen.getByPlaceholderText("What are your thoughts?");
    fireEvent.change(textarea, { target: { value: "This will fail" } });
    fireEvent.click(screen.getByRole("button", { name: /post reply/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Reply failed");
    });
  });

  it("logs and recovers when the initial posts fetch rejects", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchSequence(["reject"]);

    render(<ThreadDetailPage />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });
    expect(screen.queryByText("Great post!")).toBeNull();
    consoleSpy.mockRestore();
  });

  it("leaves the post list empty when the initial posts request is not ok", async () => {
    mockFetchSequence([{ ok: false, json: {} }]);

    render(<ThreadDetailPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("Replies")).toBeDefined();
    expect(screen.queryByText(/User /)).toBeNull();
  });

  it("toasts the generic failure message when the reply submission rejects with a non-Error value", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    fetchMock.mockImplementationOnce(() => Promise.reject("string failure"));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ThreadDetailPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText("What are your thoughts?"), {
      target: { value: "hi there" },
    });
    fireEvent.click(screen.getByRole("button", { name: /post reply/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Reply failed");
    });
  });

  it("posts to the forums posts endpoint with the thread id and content", async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: [] },
      {
        ok: true,
        json: { id: "p3", author_id: "a1", created_at: "2026-01-01T00:00:00Z", content: "hi" },
      },
    ]);

    render(<ThreadDetailPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText("What are your thoughts?"), {
      target: { value: "hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /post reply/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("/api/forums/posts"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ thread_id: "thread-1", content: "hi" }),
        })
      );
    });
  });
});
