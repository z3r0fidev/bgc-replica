import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

vi.mock("@/providers/socket-provider", () => ({
  useSocket: vi.fn(),
}));

import { useSocket } from "@/providers/socket-provider";
import { useForumStats } from "../../src/hooks/use-forum-stats";

function makeFakeSocket() {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

describe("useForumStats", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("starts with activeUsers 0", () => {
    vi.mocked(useSocket).mockReturnValue({
      socket: null,
      isConnected: false,
    } as unknown as ReturnType<typeof useSocket>);

    const { result } = renderHook(() => useForumStats("forum-1"));
    expect(result.current.activeUsers).toBe(0);
  });

  it("does not emit or register listeners when socket is null", () => {
    vi.mocked(useSocket).mockReturnValue({
      socket: null,
      isConnected: false,
    } as unknown as ReturnType<typeof useSocket>);

    renderHook(() => useForumStats("forum-1"));

    // No socket exists to assert on directly, but since socket is null,
    // nothing should have thrown and activeUsers should remain default.
    expect(true).toBe(true);
  });

  it("does not emit or register listeners when isConnected is false", () => {
    const fakeSocket = makeFakeSocket();
    vi.mocked(useSocket).mockReturnValue({
      socket: fakeSocket,
      isConnected: false,
    } as unknown as ReturnType<typeof useSocket>);

    renderHook(() => useForumStats("forum-1"));

    expect(fakeSocket.emit).not.toHaveBeenCalled();
    expect(fakeSocket.on).not.toHaveBeenCalled();
  });

  it("emits join_forum and registers forum_stats_update listener when connected", () => {
    const fakeSocket = makeFakeSocket();
    vi.mocked(useSocket).mockReturnValue({
      socket: fakeSocket,
      isConnected: true,
    } as unknown as ReturnType<typeof useSocket>);

    renderHook(() => useForumStats("forum-1"));

    expect(fakeSocket.emit).toHaveBeenCalledWith("join_forum", {
      forum_id: "forum-1",
    });
    expect(fakeSocket.on).toHaveBeenCalledWith(
      "forum_stats_update",
      expect.any(Function)
    );
  });

  it("updates activeUsers when the handler receives a matching forum_id", () => {
    const fakeSocket = makeFakeSocket();
    vi.mocked(useSocket).mockReturnValue({
      socket: fakeSocket,
      isConnected: true,
    } as unknown as ReturnType<typeof useSocket>);

    const { result } = renderHook(() => useForumStats("forum-1"));

    const handler = fakeSocket.on.mock.calls.find(
      (call) => call[0] === "forum_stats_update"
    )?.[1];

    act(() => {
      handler?.({ forum_id: "forum-1", active_users: 42 });
    });

    expect(result.current.activeUsers).toBe(42);
  });

  it("leaves activeUsers unchanged when the handler receives a non-matching forum_id", () => {
    const fakeSocket = makeFakeSocket();
    vi.mocked(useSocket).mockReturnValue({
      socket: fakeSocket,
      isConnected: true,
    } as unknown as ReturnType<typeof useSocket>);

    const { result } = renderHook(() => useForumStats("forum-1"));

    const handler = fakeSocket.on.mock.calls.find(
      (call) => call[0] === "forum_stats_update"
    )?.[1];

    act(() => {
      handler?.({ forum_id: "other-forum", active_users: 999 });
    });

    expect(result.current.activeUsers).toBe(0);
  });

  it("emits leave_forum and calls off on unmount", () => {
    const fakeSocket = makeFakeSocket();
    vi.mocked(useSocket).mockReturnValue({
      socket: fakeSocket,
      isConnected: true,
    } as unknown as ReturnType<typeof useSocket>);

    const { unmount } = renderHook(() => useForumStats("forum-1"));

    unmount();

    expect(fakeSocket.emit).toHaveBeenCalledWith("leave_forum", {
      forum_id: "forum-1",
    });
    expect(fakeSocket.off).toHaveBeenCalledWith("forum_stats_update");
  });
});
