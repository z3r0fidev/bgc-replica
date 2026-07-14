import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatWindow } from "../../src/components/chat/chat-window";
import { useChat } from "../../src/hooks/use-chat";

vi.mock("@/hooks/use-chat", () => ({
  useChat: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mirrors the count-driven behaviour of the real virtualizer closely enough
// for these tests: every message gets a virtual row so append/render
// assertions behave the same as they would against the real library.
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: (opts: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: opts.count }, (_, i) => ({
        index: i,
        key: String(i),
        start: i * 60,
        size: 60,
      })),
    getTotalSize: () => opts.count * 60,
    scrollToIndex: vi.fn(),
  }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    img: (props: Record<string, unknown>) => {
      const { drag, dragConstraints, dragElastic, ...rest } = props;
      void drag;
      void dragConstraints;
      void dragElastic;
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- test-only stand-in for motion.img; alt is spread in via rest
      return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
    },
    // TypingIndicator (rendered inside ChatWindow) also uses motion.div.
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

import { toast } from "sonner";

interface MockMessage {
  id: string;
  sender_id: string;
  content: string;
  url?: string;
  conversation_id?: string;
  room_id?: string;
  type: "TEXT" | "IMAGE";
  created_at: string;
}

function mockChatReturn(overrides: Partial<ReturnType<typeof useChat>> = {}) {
  return {
    messages: [] as MockMessage[],
    sendMessage: vi.fn(),
    setMessages: vi.fn(),
    sendTyping: vi.fn(),
    typingUsers: new Set<string>(),
    ...overrides,
  } as unknown as ReturnType<typeof useChat>;
}

describe("ChatWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the recipient name in the header, falling back to 'Chat Room'", () => {
    vi.mocked(useChat).mockReturnValue(mockChatReturn());
    const { rerender } = render(
      <ChatWindow currentUserId="u1" roomId="room-1" recipientName="Jane" />
    );
    expect(screen.getByText("Jane")).toBeDefined();

    rerender(<ChatWindow currentUserId="u1" roomId="room-1" />);
    expect(screen.getByText("Chat Room")).toBeDefined();
  });

  describe("sending a message", () => {
    it("optimistically appends via setMessages and calls sendMessage, then clears input", () => {
      const chat = mockChatReturn();
      vi.mocked(useChat).mockReturnValue(chat);

      render(<ChatWindow currentUserId="u1" roomId="room-1" conversationId="conv-1" />);

      const input = screen.getByPlaceholderText("Type a message...") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "hello there" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      expect(chat.sendMessage).toHaveBeenCalledWith("hello there");
      expect(chat.setMessages).toHaveBeenCalledTimes(1);

      // setMessages was called with an updater function; invoke it to inspect
      // the shape of the optimistic message it appends.
      const updater = vi.mocked(chat.setMessages).mock.calls[0][0] as (
        prev: MockMessage[]
      ) => MockMessage[];
      const result = updater([]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          sender_id: "u1",
          content: "hello there",
          conversation_id: "conv-1",
          room_id: "room-1",
          type: "TEXT",
        })
      );
      expect(typeof result[0].id).toBe("string");
      expect(typeof result[0].created_at).toBe("string");

      expect(input.value).toBe("");
    });

    it("does nothing when input is only whitespace", () => {
      const chat = mockChatReturn();
      vi.mocked(useChat).mockReturnValue(chat);

      render(<ChatWindow currentUserId="u1" roomId="room-1" />);
      const input = screen.getByPlaceholderText("Type a message...") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "   " } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1];
      expect(sendButton).toHaveProperty("disabled", true);

      // The Enter-key path isn't gated by the button's disabled attribute,
      // so it exercises handleSend's own `!input.trim()` early return.
      fireEvent.keyDown(input, { key: "Enter" });
      expect(chat.sendMessage).not.toHaveBeenCalled();
      expect(chat.setMessages).not.toHaveBeenCalled();
    });

    it("Enter key in the input triggers send", () => {
      const chat = mockChatReturn();
      vi.mocked(useChat).mockReturnValue(chat);

      render(<ChatWindow currentUserId="u1" roomId="room-1" />);
      const input = screen.getByPlaceholderText("Type a message...") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "via enter" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(chat.sendMessage).toHaveBeenCalledWith("via enter");
    });
  });

  describe("typing throttle", () => {
    it("only calls sendTyping again after 3000ms since the last call", () => {
      vi.useFakeTimers();
      // lastTypingTime.current starts at 0, so the initial "now" must be
      // > 3000 for the very first keystroke to pass the throttle check.
      vi.setSystemTime(10_000);
      const chat = mockChatReturn();
      vi.mocked(useChat).mockReturnValue(chat);

      render(<ChatWindow currentUserId="u1" roomId="room-1" />);
      const input = screen.getByPlaceholderText("Type a message...") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "h" } });
      expect(chat.sendTyping).toHaveBeenCalledTimes(1);

      // Immediately typing more should not re-trigger (< 3000ms gap).
      fireEvent.change(input, { target: { value: "he" } });
      expect(chat.sendTyping).toHaveBeenCalledTimes(1);

      vi.setSystemTime(10_000 + 3001);
      fireEvent.change(input, { target: { value: "hel" } });
      expect(chat.sendTyping).toHaveBeenCalledTimes(2);
    });
  });

  describe("message rendering", () => {
    it("distinguishes sender-vs-other message styling", () => {
      const chat = mockChatReturn({
        messages: [
          {
            id: "m1",
            sender_id: "u1",
            content: "mine",
            type: "TEXT",
            created_at: "2026-01-01T00:00:00Z",
          },
          {
            id: "m2",
            sender_id: "u2",
            content: "theirs",
            type: "TEXT",
            created_at: "2026-01-01T00:01:00Z",
          },
        ],
      });
      vi.mocked(useChat).mockReturnValue(chat);

      render(<ChatWindow currentUserId="u1" roomId="room-1" />);

      const mine = screen.getByText("mine");
      const theirs = screen.getByText("theirs");

      expect(mine.className).toContain("bg-primary");
      expect(mine.className).toContain("ml-auto");
      expect(theirs.className).toContain("bg-card");
      expect(theirs.className).not.toContain("ml-auto");
    });

    it("renders an <img> instead of text for IMAGE-type messages", () => {
      const chat = mockChatReturn({
        messages: [
          {
            id: "m1",
            sender_id: "u2",
            content: "fallback-text",
            url: "https://cdn.example.com/pic.png",
            type: "IMAGE",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
      });
      vi.mocked(useChat).mockReturnValue(chat);

      render(<ChatWindow currentUserId="u1" roomId="room-1" />);

      const img = screen.getByRole("img", { name: "Shared" });
      expect(img.getAttribute("src")).toBe("https://cdn.example.com/pic.png");
      expect(screen.queryByText("fallback-text")).toBeNull();
    });
  });

  describe("typing indicator", () => {
    it("only shows when typingUsers.size > 0", () => {
      const chat = mockChatReturn();
      vi.mocked(useChat).mockReturnValue(chat);
      const { rerender } = render(<ChatWindow currentUserId="u1" roomId="room-1" />);
      expect(screen.queryByText(/typing/i)).toBeNull();

      vi.mocked(useChat).mockReturnValue(
        mockChatReturn({ typingUsers: new Set(["user-123456789"]) })
      );
      rerender(<ChatWindow currentUserId="u1" roomId="room-1" />);
      expect(screen.getByText("user-123 is typing...")).toBeDefined();
    });
  });

  describe("file upload flow", () => {
    function getFileInput(container: HTMLElement) {
      return container.querySelector('input[type="file"]') as HTMLInputElement;
    }

    it("successful upload calls sendMessage(url, 'IMAGE') and shows toast.success", async () => {
      const chat = mockChatReturn();
      vi.mocked(useChat).mockReturnValue(chat);
      localStorage.setItem("access_token", "tok-123");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://cdn.example.com/uploaded.png" }),
      });

      const { container } = render(<ChatWindow currentUserId="u1" roomId="room-1" />);
      const fileInput = getFileInput(container);
      const file = new File(["binary"], "photo.png", { type: "image/png" });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(chat.sendMessage).toHaveBeenCalledWith(
          "https://cdn.example.com/uploaded.png",
          "IMAGE"
        );
      });
      expect(toast.success).toHaveBeenCalledWith("Media sent!");
      expect(fileInput.disabled).toBe(false);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/chat/media"),
        expect.objectContaining({
          method: "POST",
          headers: { Authorization: "Bearer tok-123" },
        })
      );
    });

    it("failed upload shows toast.error and resets the uploading state", async () => {
      const chat = mockChatReturn();
      vi.mocked(useChat).mockReturnValue(chat);

      global.fetch = vi.fn().mockResolvedValue({ ok: false });

      const { container } = render(<ChatWindow currentUserId="u1" roomId="room-1" />);
      const fileInput = getFileInput(container);
      const file = new File(["binary"], "photo.png", { type: "image/png" });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Upload failed");
      });
      expect(chat.sendMessage).not.toHaveBeenCalled();
      expect(fileInput.disabled).toBe(false);
    });

    it("does nothing when no file is selected", () => {
      const chat = mockChatReturn();
      vi.mocked(useChat).mockReturnValue(chat);
      global.fetch = vi.fn();

      const { container } = render(<ChatWindow currentUserId="u1" roomId="room-1" />);
      const fileInput = getFileInput(container);
      fireEvent.change(fileInput, { target: { files: [] } });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
