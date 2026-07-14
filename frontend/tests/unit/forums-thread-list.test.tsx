import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThreadList } from "../../src/components/forums/thread-list";
import { ThreadRow } from "../../src/components/forums/thread-row";
import type { ForumThread } from "../../src/services/forums";

vi.mock("next/image", () => ({
  default: (
    props: { src: string; alt: string; fill?: boolean } & Record<string, unknown>
  ) => {
    const { src, alt, fill, ...rest } = props;
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...rest} />;
  },
}));

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: (opts: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: opts.count }, (_, i) => ({
        index: i,
        key: String(i),
        start: i * 48,
        size: 48,
      })),
    getTotalSize: () => opts.count * 48,
  }),
}));

function makeThread(overrides: Partial<ForumThread> = {}): ForumThread {
  return {
    id: "t1",
    title: "Hello world thread",
    author: { name: "Alice" },
    stats: { replies: 3, views: 10 },
    last_post: {
      user: { name: "Bob", avatar: undefined },
      created_at: "2026-01-01T00:00:00Z",
    },
    is_sticky: false,
    is_hot: false,
    ...overrides,
  };
}

describe("ThreadRow", () => {
  it("shows the sticky icon when is_sticky is true", () => {
    render(<ThreadRow thread={makeThread({ is_sticky: true })} />);
    expect(screen.getByAltText("Sticky")).toBeDefined();
  });

  it("shows the hot icon when replies exceed 50, even if not sticky", () => {
    render(
      <ThreadRow
        thread={makeThread({ is_sticky: false, stats: { replies: 51, views: 1 } })}
      />
    );
    expect(screen.getByAltText("Hot")).toBeDefined();
  });

  it("shows the hot icon when views exceed 500", () => {
    render(
      <ThreadRow
        thread={makeThread({ is_sticky: false, stats: { replies: 1, views: 501 } })}
      />
    );
    expect(screen.getByAltText("Hot")).toBeDefined();
  });

  it("shows the unread icon when neither sticky nor hot", () => {
    render(
      <ThreadRow
        thread={makeThread({ is_sticky: false, stats: { replies: 1, views: 1 } })}
      />
    );
    expect(screen.getByAltText("Unread")).toBeDefined();
  });

  it("prefers the sticky icon over hot when both conditions are true", () => {
    render(
      <ThreadRow
        thread={makeThread({ is_sticky: true, stats: { replies: 100, views: 1000 } })}
      />
    );
    expect(screen.getByAltText("Sticky")).toBeDefined();
    expect(screen.queryByAltText("Hot")).toBeNull();
  });

  it("displays author, stats, and last-post info", () => {
    render(<ThreadRow thread={makeThread()} />);
    expect(screen.getByText("Hello world thread")).toBeDefined();
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("3 Replies")).toBeDefined();
    expect(screen.getByText("10 Views")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
  });
});

describe("ThreadList", () => {
  const onLoadMore = vi.fn();

  beforeEach(() => {
    onLoadMore.mockClear();
  });

  it("renders a row per thread", () => {
    const threads = [makeThread({ id: "1", title: "First" }), makeThread({ id: "2", title: "Second" })];
    render(
      <ThreadList threads={threads} hasNext={false} onLoadMore={onLoadMore} isLoading={false} />
    );
    expect(screen.getByText("First")).toBeDefined();
    expect(screen.getByText("Second")).toBeDefined();
  });

  it("shows the empty state when there are no threads and not loading", () => {
    render(<ThreadList threads={[]} hasNext={false} onLoadMore={onLoadMore} isLoading={false} />);
    expect(screen.getByText("No discussions found here yet")).toBeDefined();
  });

  it("does not show the empty state while loading", () => {
    render(<ThreadList threads={[]} hasNext={false} onLoadMore={onLoadMore} isLoading={true} />);
    expect(screen.queryByText("No discussions found here yet")).toBeNull();
  });

  it("calls onLoadMore when the loader row is reached and hasNext is true", () => {
    const threads = [makeThread({ id: "1" })];
    render(
      <ThreadList threads={threads} hasNext={true} onLoadMore={onLoadMore} isLoading={false} />
    );
    expect(onLoadMore).toHaveBeenCalled();
  });

  it("does not call onLoadMore when hasNext is false", () => {
    const threads = [makeThread({ id: "1" })];
    render(
      <ThreadList threads={threads} hasNext={false} onLoadMore={onLoadMore} isLoading={false} />
    );
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("does not call onLoadMore while already isLoading", () => {
    const threads = [makeThread({ id: "1" })];
    render(
      <ThreadList threads={threads} hasNext={true} onLoadMore={onLoadMore} isLoading={true} />
    );
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
