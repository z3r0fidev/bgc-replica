import { describe, it, expect, afterEach, vi } from "vitest";
import { useAppStore } from "@/store/use-app-store";

describe("useAppStore", () => {
  afterEach(() => {
    // Reset to a known baseline between tests so state doesn't leak.
    useAppStore.setState({ isOnline: true });
  });

  it("initializes isOnline from window.navigator.onLine in a browser (jsdom) environment", () => {
    // jsdom provides `window`, so the store's initializer should read
    // navigator.onLine rather than falling back to the SSR default of `true`.
    expect(typeof window).not.toBe("undefined");
    expect(useAppStore.getState().isOnline).toBe(window.navigator.onLine);
  });

  it("setOnline(true) sets isOnline to true", () => {
    useAppStore.setState({ isOnline: false });

    useAppStore.getState().setOnline(true);

    expect(useAppStore.getState().isOnline).toBe(true);
  });

  it("setOnline(false) sets isOnline to false", () => {
    useAppStore.setState({ isOnline: true });

    useAppStore.getState().setOnline(false);

    expect(useAppStore.getState().isOnline).toBe(false);
  });

  it("does not touch other state when toggling isOnline (sanity check on set shape)", () => {
    const before = useAppStore.getState();

    before.setOnline(false);

    const after = useAppStore.getState();
    expect(after.setOnline).toBe(before.setOnline);
    expect(after.isOnline).toBe(false);
  });
});

describe("useAppStore SSR guard", () => {
  it("falls back to true when window is undefined (module re-evaluated without window)", async () => {
    // The store computes its initial isOnline value at module-evaluation time via
    // `typeof window !== "undefined" ? window.navigator.onLine : true`. To exercise the
    // `false` branch of that ternary we have to remove `window` and re-import the module
    // fresh, since the check only runs once at import time.
    const originalWindow = globalThis.window;
    // @ts-expect-error -- deliberately deleting window to simulate an SSR/non-browser environment
    delete globalThis.window;

    vi.resetModules();
    try {
      const { useAppStore: freshStore } = await import("@/store/use-app-store");
      expect(freshStore.getState().isOnline).toBe(true);
    } finally {
      globalThis.window = originalWindow;
      vi.resetModules();
    }
  });
});
