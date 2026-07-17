import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { useEffect } from "react";
import { render, renderHook, act } from "@testing-library/react";
import {
  debounce,
  throttle,
  useIntersectionObserver,
  useLazyLoad,
  usePrefersReducedMotion,
  useVirtualList,
  preloadResource,
  preconnect,
  requestIdleCallback,
  cancelIdleCallback,
  useDeferredValue,
} from "@/lib/performance";

type VirtualListResult<T> = {
  virtualItems: { index: number; item: T; style: React.CSSProperties }[];
  totalHeight: number;
  scrollTo: (index: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
};

/** Mock IntersectionObserver that captures the callback + exposes observe/disconnect spies. */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);
  root = null;
  rootMargin = "";
  thresholds: ReadonlyArray<number> = [];

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }
}

function fireIntersection(instance: MockIntersectionObserver, isIntersecting: boolean) {
  instance.callback(
    [{ isIntersecting } as unknown as IntersectionObserverEntry],
    instance as unknown as IntersectionObserver
  );
}

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("only invokes fn once, after `wait` ms, with the args from the last call", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced("first");
    debounced("second");
    debounced("third");

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("third");
  });

  it("triggers fn again for a fresh call after the wait period has elapsed", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced("a");
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith("a");

    debounced("b");
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("b");
  });
});

describe("throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes fn immediately on the first call", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 200);

    throttled("a");

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");
  });

  it("ignores calls that occur within the limit window", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 200);

    throttled("a");
    throttled("b");
    throttled("c");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("invokes fn again once a call occurs after the window elapses", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 200);

    throttled("a");
    vi.advanceTimersByTime(200);
    throttled("d");

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("d");
  });
});

describe("useIntersectionObserver", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal(
      "IntersectionObserver",
      MockIntersectionObserver as unknown as typeof IntersectionObserver
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderProbe(options?: IntersectionObserverInit) {
    let latest: [React.RefObject<HTMLDivElement | null>, boolean] | undefined;
    function Probe() {
      const result = useIntersectionObserver(options);
      useEffect(() => {
        latest = result;
      });
      return React.createElement("div", { ref: result[0], "data-testid": "target" });
    }
    const utils = render(React.createElement(Probe));
    return { ...utils, getResult: () => latest as [React.RefObject<HTMLDivElement | null>, boolean] };
  }

  it("observes the target element on mount and starts as not intersecting", () => {
    const { getResult } = renderProbe();

    expect(getResult()[1]).toBe(false);
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(MockIntersectionObserver.instances[0].observe).toHaveBeenCalledTimes(1);
  });

  it("flips isIntersecting to true when the observer callback reports intersection", () => {
    const { getResult } = renderProbe();
    const instance = MockIntersectionObserver.instances[0];

    act(() => {
      fireIntersection(instance, true);
    });

    expect(getResult()[1]).toBe(true);
  });

  it("flips isIntersecting back to false when the observer callback reports non-intersection", () => {
    const { getResult } = renderProbe();
    const instance = MockIntersectionObserver.instances[0];

    act(() => {
      fireIntersection(instance, true);
    });
    expect(getResult()[1]).toBe(true);

    act(() => {
      fireIntersection(instance, false);
    });
    expect(getResult()[1]).toBe(false);
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = renderProbe();
    const instance = MockIntersectionObserver.instances[0];

    unmount();

    expect(instance.disconnect).toHaveBeenCalledTimes(1);
  });
});

describe("useLazyLoad", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal(
      "IntersectionObserver",
      MockIntersectionObserver as unknown as typeof IntersectionObserver
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderProbe(rootMargin?: string) {
    let latest: [React.RefObject<HTMLDivElement | null>, boolean] | undefined;
    function Probe() {
      const result = useLazyLoad(rootMargin);
      useEffect(() => {
        latest = result;
      });
      return React.createElement("div", { ref: result[0], "data-testid": "target" });
    }
    const utils = render(React.createElement(Probe));
    return { ...utils, getResult: () => latest as [React.RefObject<HTMLDivElement | null>, boolean] };
  }

  it("starts as not loaded", () => {
    const { getResult } = renderProbe();

    expect(getResult()[1]).toBe(false);
  });

  it("flips hasLoaded to true once the element intersects", () => {
    const { getResult } = renderProbe();
    const instance = MockIntersectionObserver.instances[0];

    act(() => {
      fireIntersection(instance, true);
    });

    expect(getResult()[1]).toBe(true);
  });

  it("stays loaded even if the element later stops intersecting", () => {
    const { getResult } = renderProbe();
    const instance = MockIntersectionObserver.instances[0];

    act(() => {
      fireIntersection(instance, true);
    });
    expect(getResult()[1]).toBe(true);

    act(() => {
      fireIntersection(instance, false);
    });

    // hasLoaded is a one-way latch: the effect only ever calls setHasLoaded(true).
    expect(getResult()[1]).toBe(true);
  });
});

describe("usePrefersReducedMotion", () => {
  function stubMatchMedia(initialMatches: boolean) {
    const listeners: Record<string, (event: MediaQueryListEvent) => void> = {};
    const mql = {
      matches: initialMatches,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
        listeners[event] = handler;
      }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mql));
    return { mql, listeners };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("initializes from matchMedia().matches (true)", () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);
  });

  it("initializes from matchMedia().matches (false)", () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);
  });

  it("updates when the media query change handler fires", () => {
    const { listeners } = stubMatchMedia(false);

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      listeners.change({ matches: true } as unknown as MediaQueryListEvent);
    });

    expect(result.current).toBe(true);
  });

  it("removes the change listener on unmount", () => {
    const { mql } = stubMatchMedia(false);

    const { unmount } = renderHook(() => usePrefersReducedMotion());
    unmount();

    expect(mql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});

describe("useVirtualList", () => {
  function renderProbe<T>(
    items: T[],
    itemHeight: number,
    containerHeight: number,
    overscan?: number
  ) {
    let latest: VirtualListResult<T> | undefined;
    function Probe() {
      const result = useVirtualList(items, itemHeight, containerHeight, overscan);
      useEffect(() => {
        latest = result;
      });
      return React.createElement("div", { ref: result.containerRef, "data-testid": "container" });
    }
    const utils = render(React.createElement(Probe));
    return { ...utils, getResult: () => latest as VirtualListResult<T> };
  }

  it("computes totalHeight from the full item count", () => {
    const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
    const { getResult } = renderProbe(items, 50, 200, 1);

    expect(getResult().totalHeight).toBe(100 * 50);
  });

  it("windows the visible range with overscan at scrollTop 0", () => {
    const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
    const { getResult } = renderProbe(items, 50, 200, 1);

    // visibleCount = ceil(200/50) = 4
    // startIndex = max(0, floor(0/50) - 1) = 0
    // endIndex = min(99, 0 + 4 + 1*2) = 6  -> indices 0..6 (7 items)
    const result = getResult();
    expect(result.virtualItems).toHaveLength(7);
    expect(result.virtualItems[0].index).toBe(0);
    expect(result.virtualItems[result.virtualItems.length - 1].index).toBe(6);
    expect(result.virtualItems[0].item).toBe("item-0");
    expect(result.virtualItems[0].style).toMatchObject({
      position: "absolute",
      top: 0,
      height: 50,
      width: "100%",
    });
  });

  it("shifts the windowed range after a scroll event updates scrollTop", () => {
    const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
    const { getResult, getByTestId } = renderProbe(items, 50, 200, 1);

    act(() => {
      const container = getByTestId("container");
      container.scrollTop = 500;
      container.dispatchEvent(new Event("scroll"));
    });

    // startIndex = max(0, floor(500/50) - 1) = 9
    // endIndex = min(99, 9 + 4 + 1*2) = 15 -> indices 9..15 (7 items)
    const result = getResult();
    expect(result.virtualItems[0].index).toBe(9);
    expect(result.virtualItems[result.virtualItems.length - 1].index).toBe(15);
    expect(result.virtualItems).toHaveLength(7);
  });

  it("scrollTo sets containerRef.current.scrollTop", () => {
    const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
    const { getResult, getByTestId } = renderProbe(items, 50, 200, 1);

    act(() => {
      getResult().scrollTo(10);
    });

    expect(getByTestId("container").scrollTop).toBe(500);
  });
});

describe("preloadResource", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("appends a <link rel=preload> element with the correct href/as", () => {
    preloadResource("/fonts/inter.woff2", "font");

    const link = document.head.querySelector('link[rel="preload"]') as HTMLLinkElement | null;
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("/fonts/inter.woff2");
    // Note: jsdom does not reflect the `as` IDL property back to the "as" content
    // attribute (unlike real browsers), so assert on the property instead of
    // getAttribute("as") here.
    expect(link?.as).toBe("font");
  });
});

describe("preconnect", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("appends a <link rel=preconnect> element with the correct href", () => {
    preconnect("https://cdn.example.com");

    const link = document.head.querySelector('link[rel="preconnect"]');
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("https://cdn.example.com");
  });
});

describe("requestIdleCallback / cancelIdleCallback", () => {
  const originalRIC = window.requestIdleCallback;
  const originalCIC = window.cancelIdleCallback;

  afterEach(() => {
    if (originalRIC) {
      window.requestIdleCallback = originalRIC;
    } else {
      delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
    }
    if (originalCIC) {
      window.cancelIdleCallback = originalCIC;
    } else {
      delete (window as unknown as { cancelIdleCallback?: unknown }).cancelIdleCallback;
    }
    vi.useRealTimers();
  });

  it("delegates to window.requestIdleCallback when available and returns its handle", () => {
    const mockRIC = vi.fn().mockReturnValue(42);
    window.requestIdleCallback = mockRIC as unknown as typeof window.requestIdleCallback;
    const cb = vi.fn();

    const handle = requestIdleCallback(cb);

    expect(mockRIC).toHaveBeenCalledWith(cb, undefined);
    expect(handle).toBe(42);
  });

  it("delegates to window.cancelIdleCallback when available", () => {
    const mockCIC = vi.fn();
    window.cancelIdleCallback = mockCIC as unknown as typeof window.cancelIdleCallback;

    cancelIdleCallback(99);

    expect(mockCIC).toHaveBeenCalledWith(99);
  });

  it("falls back to setTimeout when window.requestIdleCallback is unavailable", () => {
    delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
    vi.useFakeTimers();
    const cb = vi.fn();

    requestIdleCallback(cb);
    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("falls back to clearTimeout when window.cancelIdleCallback is unavailable", () => {
    delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
    delete (window as unknown as { cancelIdleCallback?: unknown }).cancelIdleCallback;
    vi.useFakeTimers();
    const cb = vi.fn();

    const handle = requestIdleCallback(cb);
    cancelIdleCallback(handle);
    vi.advanceTimersByTime(5);

    expect(cb).not.toHaveBeenCalled();
  });
});

describe("useDeferredValue", () => {
  const originalRIC = window.requestIdleCallback;
  const originalCIC = window.cancelIdleCallback;

  afterEach(() => {
    if (originalRIC) {
      window.requestIdleCallback = originalRIC;
    } else {
      delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
    }
    if (originalCIC) {
      window.cancelIdleCallback = originalCIC;
    } else {
      delete (window as unknown as { cancelIdleCallback?: unknown }).cancelIdleCallback;
    }
    vi.useRealTimers();
  });

  it("defers via requestIdleCallback when delay is 0", () => {
    let capturedCallback: (() => void) | null = null;
    const mockRIC = vi.fn((cb: () => void) => {
      capturedCallback = cb;
      return 1;
    });
    window.requestIdleCallback = mockRIC as unknown as typeof window.requestIdleCallback;
    window.cancelIdleCallback = vi.fn() as unknown as typeof window.cancelIdleCallback;

    const { result, rerender } = renderHook(({ value }) => useDeferredValue(value, 0), {
      initialProps: { value: "a" },
    });
    expect(result.current).toBe("a");

    rerender({ value: "b" });
    expect(result.current).toBe("a");
    expect(mockRIC).toHaveBeenCalled();

    act(() => {
      capturedCallback?.();
    });

    expect(result.current).toBe("b");
  });

  it("defers via setTimeout and only updates after `delay` ms when delay > 0", () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(({ value }) => useDeferredValue(value, 200), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("b");
  });
});
