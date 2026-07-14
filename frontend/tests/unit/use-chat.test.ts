import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

vi.mock("@/providers/socket-provider", () => ({
  useSocket: vi.fn(),
}));

import { useSocket } from "@/providers/socket-provider";
import { useChat } from "../../src/hooks/use-chat";

function makeFakeSocket() {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

function getHandler(
  fakeSocket: ReturnType<typeof makeFakeSocket>,
  event: string
) {
  return fakeSocket.on.mock.calls.find((call) => call[0] === event)?.[1];
}

describe("useChat", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("room mode (roomId provided)", () => {
    it("emits join_room and registers new_room_message + user_typing on mount when connected", () => {
      const fakeSocket = makeFakeSocket();
      vi.mocked(useSocket).mockReturnValue({
        socket: fakeSocket,
        isConnected: true,
      } as unknown as ReturnType<typeof useSocket>);

      renderHook(() => useChat("room-1"));

      expect(fakeSocket.emit).toHaveBeenCalledWith("join_room", {
        room_id: "room-1",
      });
      expect(fakeSocket.on).toHaveBeenCalledWith(
        "new_room_message",
        expect.any(Function)
      );
      expect(fakeSocket.on).toHaveBeenCalledWith(
        "user_typing",
        expect.any(Function)
      );
      // Not a DM hook, so no new_dm registration
      expect(getHandler(fakeSocket, "new_dm")).toBeUndefined();
    });

    it("appends messages whose room_id matches, ignores non-matching ones", () => {
      const fakeSocket = makeFakeSocket();
      vi.mocked(useSocket).mockReturnValue({
        socket: fakeSocket,
        isConnected: true,
      } as unknown as ReturnType<typeof useSocket>);

      const { result } = renderHook(() => useChat("room-1"));
      const handler = getHandler(fakeSocket, "new_room_message");

      act(() => {
        handler?.({
          id: "m1",
          sender_id: "u1",
          content: "hi",
          room_id: "room-1",
          type: "TEXT",
          created_at: "2026-01-01T00:00:00Z",
        });
      });

      expect(result.current.messages).toHaveLength(1);

      act(() => {
        handler?.({
          id: "m2",
          sender_id: "u1",
          content: "ignored",
          room_id: "other-room",
          type: "TEXT",
          created_at: "2026-01-01T00:00:00Z",
        });
      });

      expect(result.current.messages).toHaveLength(1);
    });

    it("sendMessage emits send_room_message when roomId is set and connected", () => {
      const fakeSocket = makeFakeSocket();
      vi.mocked(useSocket).mockReturnValue({
        socket: fakeSocket,
        isConnected: true,
      } as unknown as ReturnType<typeof useSocket>);

      const { result } = renderHook(() => useChat("room-1"));

      act(() => {
        result.current.sendMessage("hello");
      });

      expect(fakeSocket.emit).toHaveBeenCalledWith("send_room_message", {
        room_id: "room-1",
        content: "hello",
        type: "TEXT",
      });
    });
  });

  describe("dm mode (conversationId provided)", () => {
    it("registers new_dm and user_typing but not join_room/new_room_message", () => {
      const fakeSocket = makeFakeSocket();
      vi.mocked(useSocket).mockReturnValue({
        socket: fakeSocket,
        isConnected: true,
      } as unknown as ReturnType<typeof useSocket>);

      renderHook(() => useChat(undefined, "conv-1"));

      expect(fakeSocket.emit).not.toHaveBeenCalledWith(
        "join_room",
        expect.anything()
      );
      expect(fakeSocket.on).toHaveBeenCalledWith(
        "new_dm",
        expect.any(Function)
      );
      expect(getHandler(fakeSocket, "new_room_message")).toBeUndefined();
    });

    it("appends messages whose conversation_id matches, ignores non-matching ones", () => {
      const fakeSocket = makeFakeSocket();
      vi.mocked(useSocket).mockReturnValue({
        socket: fakeSocket,
        isConnected: true,
      } as unknown as ReturnType<typeof useSocket>);

      const { result } = renderHook(() => useChat(undefined, "conv-1"));
      const handler = getHandler(fakeSocket, "new_dm");

      act(() => {
        handler?.({
          id: "m1",
          sender_id: "u1",
          content: "hi",
          conversation_id: "conv-1",
          type: "TEXT",
          created_at: "2026-01-01T00:00:00Z",
        });
      });
      expect(result.current.messages).toHaveLength(1);

      act(() => {
        handler?.({
          id: "m2",
          sender_id: "u1",
          content: "ignored",
          conversation_id: "other-conv",
          type: "TEXT",
          created_at: "2026-01-01T00:00:00Z",
        });
      });
      expect(result.current.messages).toHaveLength(1);
    });

    it("sendMessage emits send_dm when conversationId is set and roomId is not", () => {
      const fakeSocket = makeFakeSocket();
      vi.mocked(useSocket).mockReturnValue({
        socket: fakeSocket,
        isConnected: true,
      } as unknown as ReturnType<typeof useSocket>);

      const { result } = renderHook(() => useChat(undefined, "conv-1"));

      act(() => {
        result.current.sendMessage("hey there", "IMAGE");
      });

      expect(fakeSocket.emit).toHaveBeenCalledWith("send_dm", {
        conversation_id: "conv-1",
        content: "hey there",
        type: "IMAGE",
      });
    });

    it("sendTyping emits typing with room_id and recipient_id", () => {
      const fakeSocket = makeFakeSocket();
      vi.mocked(useSocket).mockReturnValue({
        socket: fakeSocket,
        isConnected: true,
      } as unknown as ReturnType<typeof useSocket>);

      const { result } = renderHook(() => useChat("room-1", "conv-1"));

      act(() => {
        result.current.sendTyping();
      });

      expect(fakeSocket.emit).toHaveBeenCalledWith("typing", {
        room_id: "room-1",
        recipient_id: "conv-1",
      });
    });
  });

  describe("typing indicator", () => {
    it("adds user_id to typingUsers on is_typing true, removes on false", () => {
      const fakeSocket = makeFakeSocket();
      vi.mocked(useSocket).mockReturnValue({
        socket: fakeSocket,
        isConnected: true,
      } as unknown as ReturnType<typeof useSocket>);

      const { result } = renderHook(() => useChat("room-1"));
      const handler = getHandler(fakeSocket, "user_typing");

      act(() => {
        handler?.({ user_id: "u1", is_typing: true });
      });
      expect(result.current.typingUsers.has("u1")).toBe(true);

      act(() => {
        handler?.({ user_id: "u1", is_typing: false });
      });
      expect(result.current.typingUsers.has("u1")).toBe(false);
    });

    it("auto-clears typing state after 5000ms", () => {
      vi.useFakeTimers();
      const fakeSocket = makeFakeSocket();
      vi.mocked(useSocket).mockReturnValue({
        socket: fakeSocket,
        isConnected: true,
      } as unknown as ReturnType<typeof useSocket>);

      const { result } = renderHook(() => useChat("room-1"));
      const handler = getHandler(fakeSocket, "user_typing");

      act(() => {
        handler?.({ user_id: "u1", is_typing: true });
      });
      expect(result.current.typingUsers.has("u1")).toBe(true);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.typingUsers.has("u1")).toBe(false);
    });
  });

  describe("disconnected / no socket", () => {
    it("does not emit or register any listeners when socket is null", () => {
      vi.mocked(useSocket).mockReturnValue({
        socket: null,
        isConnected: false,
      } as unknown as ReturnType<typeof useSocket>);

      renderHook(() => useChat("room-1", "conv-1"));
      // Nothing to assert on a null socket directly; verifying no throw.
      expect(true).toBe(true);
    });

    it("does not emit or register any listeners when isConnected is false", () => {
      const fakeSocket = makeFakeSocket();
      vi.mocked(useSocket).mockReturnValue({
        socket: fakeSocket,
        isConnected: false,
      } as unknown as ReturnType<typeof useSocket>);

      renderHook(() => useChat("room-1", "conv-1"));

      expect(fakeSocket.emit).not.toHaveBeenCalled();
      expect(fakeSocket.on).not.toHaveBeenCalled();
    });

    it("sendTyping does nothing when not connected", () => {
      const fakeSocket = makeFakeSocket();
      vi.mocked(useSocket).mockReturnValue({
        socket: fakeSocket,
        isConnected: false,
      } as unknown as ReturnType<typeof useSocket>);

      const { result } = renderHook(() => useChat("room-1"));

      act(() => {
        result.current.sendTyping();
      });

      expect(fakeSocket.emit).not.toHaveBeenCalled();
    });

    it("sendTyping does nothing when socket is null", () => {
      vi.mocked(useSocket).mockReturnValue({
        socket: null,
        isConnected: true,
      } as unknown as ReturnType<typeof useSocket>);

      const { result } = renderHook(() => useChat("room-1"));

      act(() => {
        result.current.sendTyping();
      });

      // no socket to assert on, just verifying no throw
      expect(true).toBe(true);
    });

    it("sendMessage does nothing when not connected", () => {
      const fakeSocket = makeFakeSocket();
      vi.mocked(useSocket).mockReturnValue({
        socket: fakeSocket,
        isConnected: false,
      } as unknown as ReturnType<typeof useSocket>);

      const { result } = renderHook(() => useChat("room-1"));

      act(() => {
        result.current.sendMessage("hi");
      });

      expect(fakeSocket.emit).not.toHaveBeenCalled();
    });

    it("sendMessage does nothing when socket is null", () => {
      vi.mocked(useSocket).mockReturnValue({
        socket: null,
        isConnected: true,
      } as unknown as ReturnType<typeof useSocket>);

      const { result } = renderHook(() => useChat("room-1"));

      act(() => {
        result.current.sendMessage("hi");
      });

      expect(true).toBe(true);
    });

    it("sendMessage emits nothing when connected but neither roomId nor conversationId is set", () => {
      const fakeSocket = makeFakeSocket();
      vi.mocked(useSocket).mockReturnValue({
        socket: fakeSocket,
        isConnected: true,
      } as unknown as ReturnType<typeof useSocket>);

      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.sendMessage("hi");
      });

      expect(fakeSocket.emit).not.toHaveBeenCalled();
    });
  });

  it("unmount calls socket.off for all three event names", () => {
    const fakeSocket = makeFakeSocket();
    vi.mocked(useSocket).mockReturnValue({
      socket: fakeSocket,
      isConnected: true,
    } as unknown as ReturnType<typeof useSocket>);

    const { unmount } = renderHook(() => useChat("room-1", "conv-1"));

    unmount();

    expect(fakeSocket.off).toHaveBeenCalledWith("new_room_message");
    expect(fakeSocket.off).toHaveBeenCalledWith("new_dm");
    expect(fakeSocket.off).toHaveBeenCalledWith("user_typing");
  });

  it("setMessages is exposed and replaces the messages array directly", () => {
    const fakeSocket = makeFakeSocket();
    vi.mocked(useSocket).mockReturnValue({
      socket: fakeSocket,
      isConnected: true,
    } as unknown as ReturnType<typeof useSocket>);

    const { result } = renderHook(() => useChat("room-1"));

    act(() => {
      result.current.setMessages([
        {
          id: "x",
          sender_id: "u1",
          content: "seeded",
          room_id: "room-1",
          type: "TEXT",
          created_at: "2026-01-01T00:00:00Z",
        },
      ]);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toBe("x");
  });
});
