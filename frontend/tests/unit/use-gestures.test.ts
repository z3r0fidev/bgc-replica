import { describe, it, expect, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

vi.mock("framer-motion", () => ({
  useDragControls: () => ({}),
}));

import { useGestures } from "../../src/hooks/useGestures";

describe("useGestures", () => {
  it("starts with swipeDirection null", () => {
    const { result } = renderHook(() => useGestures());
    expect(result.current.swipeDirection).toBeNull();
  });

  it("exposes drag controls from framer-motion", () => {
    const { result } = renderHook(() => useGestures());
    expect(result.current.controls).toEqual({});
  });

  it("sets swipeDirection to 'right' when offset.x exceeds threshold", () => {
    const { result } = renderHook(() => useGestures());

    act(() => {
      result.current.handleDragEnd(
        {} as MouseEvent,
        { offset: { x: 150 } }
      );
    });

    expect(result.current.swipeDirection).toBe("right");
  });

  it("sets swipeDirection to 'left' when offset.x is below negative threshold", () => {
    const { result } = renderHook(() => useGestures());

    act(() => {
      result.current.handleDragEnd(
        {} as MouseEvent,
        { offset: { x: -150 } }
      );
    });

    expect(result.current.swipeDirection).toBe("left");
  });

  it("sets swipeDirection to null when offset.x is within threshold", () => {
    const { result } = renderHook(() => useGestures());

    // First push it right so we can prove it resets
    act(() => {
      result.current.handleDragEnd(
        {} as MouseEvent,
        { offset: { x: 150 } }
      );
    });
    expect(result.current.swipeDirection).toBe("right");

    act(() => {
      result.current.handleDragEnd(
        {} as MouseEvent,
        { offset: { x: 50 } }
      );
    });

    expect(result.current.swipeDirection).toBeNull();
  });

  it("treats exactly the threshold boundary (100/-100) as not a swipe", () => {
    const { result } = renderHook(() => useGestures());

    act(() => {
      result.current.handleDragEnd(
        {} as MouseEvent,
        { offset: { x: 100 } }
      );
    });
    expect(result.current.swipeDirection).toBeNull();

    act(() => {
      result.current.handleDragEnd(
        {} as MouseEvent,
        { offset: { x: -100 } }
      );
    });
    expect(result.current.swipeDirection).toBeNull();
  });

  it("resetSwipe sets swipeDirection back to null", () => {
    const { result } = renderHook(() => useGestures());

    act(() => {
      result.current.handleDragEnd(
        {} as MouseEvent,
        { offset: { x: 150 } }
      );
    });
    expect(result.current.swipeDirection).toBe("right");

    act(() => {
      result.current.resetSwipe();
    });

    expect(result.current.swipeDirection).toBeNull();
  });
});
