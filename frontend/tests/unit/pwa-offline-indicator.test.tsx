import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { OfflineIndicator } from "../../src/components/pwa/offline-indicator";

// offline-indicator.tsx actually reads from the Zustand `useAppStore`
// (src/store/use-app-store.ts), not the `useOnlineStatus` hook - confirmed by
// reading the component source. Mock the store directly instead.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

const setOnlineMock = vi.fn();
let mockIsOnline = true;

vi.mock("../../src/store/use-app-store", () => ({
  useAppStore: () => ({
    isOnline: mockIsOnline,
    setOnline: setOnlineMock,
  }),
}));

describe("OfflineIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOnline = true;
  });

  it("renders nothing while online", () => {
    mockIsOnline = true;
    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the offline banner when isOnline is false", () => {
    mockIsOnline = false;
    render(<OfflineIndicator />);
    expect(screen.getByText(/you are currently offline/i)).toBeDefined();
  });

  it("resyncs the store with navigator.onLine on mount", () => {
    const originalOnLine = Object.getOwnPropertyDescriptor(window.navigator, "onLine");
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });

    render(<OfflineIndicator />);

    expect(setOnlineMock).toHaveBeenCalledWith(false);

    if (originalOnLine) {
      Object.defineProperty(window.navigator, "onLine", originalOnLine);
    }
  });

  it("calls setOnline(true) when a window 'online' event fires", () => {
    render(<OfflineIndicator />);
    setOnlineMock.mockClear();

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(setOnlineMock).toHaveBeenCalledWith(true);
  });

  it("calls setOnline(false) when a window 'offline' event fires", () => {
    render(<OfflineIndicator />);
    setOnlineMock.mockClear();

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(setOnlineMock).toHaveBeenCalledWith(false);
  });

  it("removes its online/offline listeners on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<OfflineIndicator />);
    unmount();

    expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("offline", expect.any(Function));
    removeSpy.mockRestore();
  });
});
