import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChatPage from "../../src/app/(protected)/chat/page";

vi.mock("@/components/chat/chat-window", () => ({
  ChatWindow: (props: Record<string, unknown>) => (
    <div data-testid="chat-window">
      <span data-testid="conversation-id">{String(props.conversationId ?? "")}</span>
      <span data-testid="current-user-id">{String(props.currentUserId ?? "")}</span>
      <span data-testid="recipient-name">{String(props.recipientName ?? "")}</span>
    </div>
  ),
}));

function mockFetchSequence(
  responses: Array<{ ok: boolean; json?: unknown } | "reject">
) {
  const fn = vi.fn();
  for (const r of responses) {
    if (r === "reject") {
      fn.mockImplementationOnce(() => Promise.reject(new Error("network down")));
    } else {
      fn.mockImplementationOnce(() =>
        Promise.resolve({ ok: r.ok, json: () => Promise.resolve(r.json) })
      );
    }
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe("ChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows the empty state when there are no conversations", async () => {
    mockFetchSequence([
      { ok: true, json: { items: [] } },
      { ok: true, json: { id: "me-1" } },
    ]);

    render(<ChatPage />);

    await waitFor(() => {
      expect(screen.getByText("No active conversations.")).toBeDefined();
    });
    expect(
      screen.getByText("Select a conversation to start chatting.")
    ).toBeDefined();
  });

  it("fetches conversations and current user with the auth token", async () => {
    localStorage.setItem("access_token", "tok-123");
    const fetchMock = mockFetchSequence([
      { ok: true, json: { items: [{ id: "conv-abcdef12" }] } },
      { ok: true, json: { id: "me-1" } },
    ]);

    render(<ChatPage />);

    await waitFor(() => {
      expect(screen.getByText(/Conversation conv-abc/)).toBeDefined();
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/chat/conversations"),
      expect.objectContaining({
        headers: { Authorization: "Bearer tok-123" },
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/auth/me"),
      expect.objectContaining({
        headers: { Authorization: "Bearer tok-123" },
      })
    );
  });

  it("selects a conversation on click and renders the ChatWindow with its id", async () => {
    mockFetchSequence([
      { ok: true, json: { items: [{ id: "conv-abcdef12" }] } },
      { ok: true, json: { id: "me-1" } },
    ]);

    render(<ChatPage />);

    const card = await screen.findByText(/Conversation conv-abc/);
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByTestId("chat-window")).toBeDefined();
    });
    expect(screen.getByTestId("conversation-id").textContent).toBe(
      "conv-abcdef12"
    );
    expect(screen.getByTestId("current-user-id").textContent).toBe("me-1");
    expect(screen.getByTestId("recipient-name").textContent).toBe(
      "User conv-abc"
    );
  });

  it("shows the placeholder when no conversation is selected yet", async () => {
    mockFetchSequence([
      { ok: true, json: { items: [] } },
      { ok: true, json: { id: "me-1" } },
    ]);

    render(<ChatPage />);

    expect(
      screen.getByText("Select a conversation to start chatting.")
    ).toBeDefined();
    expect(screen.queryByTestId("chat-window")).toBeNull();
  });

  it("handles a fetch rejection gracefully, leaving the conversation list empty", async () => {
    mockFetchSequence(["reject"]);

    render(<ChatPage />);

    await waitFor(() => {
      expect(screen.getByText("No active conversations.")).toBeDefined();
    });
  });

  it("does not add conversations when the conversations request is not ok", async () => {
    mockFetchSequence([
      { ok: false, json: {} },
      { ok: true, json: { id: "me-1" } },
    ]);

    render(<ChatPage />);

    await waitFor(() => {
      expect(screen.getByText("No active conversations.")).toBeDefined();
    });
  });

  it("falls back to an empty conversation list when the response has no items field", async () => {
    mockFetchSequence([
      { ok: true, json: {} },
      { ok: true, json: { id: "me-1" } },
    ]);

    render(<ChatPage />);

    await waitFor(() => {
      expect(screen.getByText("No active conversations.")).toBeDefined();
    });
  });

  it("leaves currentUserId unset when the /auth/me request is not ok", async () => {
    mockFetchSequence([
      { ok: true, json: { items: [{ id: "conv-abcdef12" }] } },
      { ok: false, json: {} },
    ]);

    render(<ChatPage />);

    const card = await screen.findByText(/Conversation conv-abc/);
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByTestId("chat-window")).toBeDefined();
    });
    expect(screen.getByTestId("current-user-id").textContent).toBe("");
  });
});
