import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import RoomsPage from "../../src/app/(protected)/rooms/page";
import RoomDetailPage from "../../src/app/(protected)/rooms/[id]/page";

const mockUseParams = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
}));

vi.mock("@/components/chat/chat-window", () => ({
  ChatWindow: (props: Record<string, unknown>) => (
    <div data-testid="chat-window">
      <span data-testid="room-id">{String(props.roomId ?? "")}</span>
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

describe("RoomsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows a loading state before rooms arrive", () => {
    mockFetchSequence([{ ok: true, json: { items: [] } }]);
    render(<RoomsPage />);
    expect(screen.getByText("Loading rooms...")).toBeDefined();
  });

  it("renders rooms returned by the API, including category and description", async () => {
    mockFetchSequence([
      {
        ok: true,
        json: {
          items: [
            {
              id: "room-1",
              name: "General Chat",
              description: "Talk about anything",
              category: "General",
            },
          ],
        },
      },
    ]);

    render(<RoomsPage />);

    await waitFor(() => {
      expect(screen.getByText("General Chat")).toBeDefined();
    });
    expect(screen.getByText("Talk about anything")).toBeDefined();
    expect(screen.getByText("General")).toBeDefined();
    expect(screen.getByRole("link", { name: /join chat/i })).toHaveProperty(
      "href",
      expect.stringContaining("/rooms/room-1")
    );
  });

  it("falls back to a default description when none is provided", async () => {
    mockFetchSequence([
      {
        ok: true,
        json: { items: [{ id: "room-2", name: "No Desc Room" }] },
      },
    ]);

    render(<RoomsPage />);

    await waitFor(() => {
      expect(screen.getByText("No description provided.")).toBeDefined();
    });
  });

  it("shows the empty state when there are no rooms", async () => {
    mockFetchSequence([{ ok: true, json: { items: [] } }]);

    render(<RoomsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No public chat rooms available at the moment.")
      ).toBeDefined();
    });
  });

  it("recovers to the empty state when the fetch rejects", async () => {
    mockFetchSequence(["reject"]);

    render(<RoomsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No public chat rooms available at the moment.")
      ).toBeDefined();
    });
  });

  it("shows the empty state when the rooms request is not ok", async () => {
    mockFetchSequence([{ ok: false, json: {} }]);

    render(<RoomsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No public chat rooms available at the moment.")
      ).toBeDefined();
    });
  });

  it("falls back to an empty room list when the response has no items field", async () => {
    mockFetchSequence([{ ok: true, json: {} }]);

    render(<RoomsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No public chat rooms available at the moment.")
      ).toBeDefined();
    });
  });
});

describe("RoomDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseParams.mockReturnValue({ id: "room-1" });
  });

  it("shows a loading indicator while the room has not been resolved", () => {
    mockFetchSequence([
      { ok: true, json: [] },
      { ok: true, json: { id: "me-1" } },
    ]);
    render(<RoomDetailPage />);
    expect(screen.getByText("Loading room...")).toBeDefined();
  });

  it("renders the ChatWindow once the matching room and current user load", async () => {
    mockFetchSequence([
      {
        ok: true,
        json: [
          { id: "room-1", name: "General Chat" },
          { id: "room-2", name: "Other Room" },
        ],
      },
      { ok: true, json: { id: "me-1" } },
    ]);

    render(<RoomDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-window")).toBeDefined();
    });
    expect(screen.getByTestId("room-id").textContent).toBe("room-1");
    expect(screen.getByTestId("current-user-id").textContent).toBe("me-1");
    expect(screen.getByTestId("recipient-name").textContent).toBe(
      "General Chat"
    );
  });

  it("stays on the loading state when no room in the list matches the id param", async () => {
    mockFetchSequence([
      { ok: true, json: [{ id: "some-other-room", name: "Other" }] },
      { ok: true, json: { id: "me-1" } },
    ]);

    render(<RoomDetailPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByText("Loading room...")).toBeDefined();
    expect(screen.queryByTestId("chat-window")).toBeNull();
  });

  it("does not throw when the rooms fetch rejects", async () => {
    mockFetchSequence(["reject"]);

    render(<RoomDetailPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("Loading room...")).toBeDefined();
  });

  it("stays loading when the rooms request is not ok, but still requests the current user", async () => {
    const fetchMock = mockFetchSequence([
      { ok: false, json: {} },
      { ok: true, json: { id: "me-1" } },
    ]);

    render(<RoomDetailPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByText("Loading room...")).toBeDefined();
  });

  it("leaves currentUserId unset when the /auth/me request is not ok", async () => {
    mockFetchSequence([
      { ok: true, json: [{ id: "room-1", name: "General Chat" }] },
      { ok: false, json: {} },
    ]);

    render(<RoomDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-window")).toBeDefined();
    });
    expect(screen.getByTestId("current-user-id").textContent).toBe("");
  });
});
