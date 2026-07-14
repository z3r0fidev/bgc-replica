import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useOnlineStatus } from "../../src/hooks/use-online-status";

describe("useOnlineStatus", () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    originalOnLine = window.navigator.onLine;
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, "onLine", {
      value: originalOnLine,
      configurable: true,
    });
  });

  it("initializes from navigator.onLine (true)", () => {
    Object.defineProperty(window.navigator, "onLine", {
      value: true,
      configurable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);
  });

  it("initializes from navigator.onLine (false)", () => {
    Object.defineProperty(window.navigator, "onLine", {
      value: false,
      configurable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);
  });

  it("flips to false when an offline event fires", () => {
    Object.defineProperty(window.navigator, "onLine", {
      value: true,
      configurable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current).toBe(false);
  });

  it("flips to true when an online event fires", () => {
    Object.defineProperty(window.navigator, "onLine", {
      value: false,
      configurable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current).toBe(true);
  });

  it("removes online/offline listeners on unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useOnlineStatus());

    expect(addSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("offline", expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("offline", expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("does not update state after unmount when events fire", () => {
    Object.defineProperty(window.navigator, "onLine", {
      value: true,
      configurable: true,
    });

    const { result, unmount } = renderHook(() => useOnlineStatus());
    unmount();

    // Should not throw / not affect anything post-unmount
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current).toBe(true);
  });
});
