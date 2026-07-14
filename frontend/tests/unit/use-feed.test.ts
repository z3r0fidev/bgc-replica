import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useFeed } from "../../src/hooks/use-feed";
import type { FeedPost } from "../../src/types/feed";

function makePosts(count: number, prefix = "p"): FeedPost[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    author_id: "author-1",
    content: `content ${prefix}-${i}`,
    created_at: new Date().toISOString(),
  }));
}

describe("useFeed", () => {
  it("starts with an empty posts array", () => {
    const { result } = renderHook(() => useFeed());
    expect(result.current.posts).toEqual([]);
  });

  it("addPosts defaults to bottom position (appends)", () => {
    const { result } = renderHook(() => useFeed());

    act(() => {
      result.current.addPosts(makePosts(2, "a"));
    });
    act(() => {
      result.current.addPosts(makePosts(2, "b"));
    });

    expect(result.current.posts.map((p) => p.id)).toEqual([
      "a-0",
      "a-1",
      "b-0",
      "b-1",
    ]);
  });

  it("addPosts with position 'top' prepends", () => {
    const { result } = renderHook(() => useFeed());

    act(() => {
      result.current.addPosts(makePosts(2, "a"));
    });
    act(() => {
      result.current.addPosts(makePosts(2, "b"), "top");
    });

    expect(result.current.posts.map((p) => p.id)).toEqual([
      "b-0",
      "b-1",
      "a-0",
      "a-1",
    ]);
  });

  it("prunes to the LAST 500 items when exceeding MAX_FEED_ITEMS with 'bottom' position", () => {
    const { result } = renderHook(() => useFeed());

    act(() => {
      result.current.addPosts(makePosts(300, "first"));
    });
    act(() => {
      result.current.addPosts(makePosts(300, "second"));
    });

    expect(result.current.posts).toHaveLength(500);
    // Bottom position keeps the LAST 500 -> tail end of "first" plus all of "second"
    expect(result.current.posts[0].id).toBe("first-100");
    expect(result.current.posts[result.current.posts.length - 1].id).toBe(
      "second-299"
    );
  });

  it("prunes to the FIRST 500 items when exceeding MAX_FEED_ITEMS with 'top' position", () => {
    const { result } = renderHook(() => useFeed());

    act(() => {
      result.current.addPosts(makePosts(300, "first"));
    });
    act(() => {
      // "second" is prepended (top), combined = second(300) + first(300) = 600, keep first 500
      result.current.addPosts(makePosts(300, "second"), "top");
    });

    expect(result.current.posts).toHaveLength(500);
    expect(result.current.posts[0].id).toBe("second-0");
    expect(result.current.posts[result.current.posts.length - 1].id).toBe(
      "first-199"
    );
  });

  it("does not prune when combined length is exactly at the limit", () => {
    const { result } = renderHook(() => useFeed());

    act(() => {
      result.current.addPosts(makePosts(500, "x"));
    });

    expect(result.current.posts).toHaveLength(500);
    expect(result.current.posts[0].id).toBe("x-0");
    expect(result.current.posts[499].id).toBe("x-499");
  });

  it("exposes setPosts directly to replace the full posts array", () => {
    const { result } = renderHook(() => useFeed());
    const replacement = makePosts(3, "replaced");

    act(() => {
      result.current.setPosts(replacement);
    });

    expect(result.current.posts).toEqual(replacement);

    act(() => {
      result.current.setPosts([]);
    });

    expect(result.current.posts).toEqual([]);
  });
});
