import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SharedAlbumPage from "../../src/app/shared/album/[token]/page";
import type { GalleryMedia } from "../../src/types/gallery";

const mockUseParams = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
}));

vi.mock("@/components/gallery", () => ({
  GalleryGrid: (props: {
    items: GalleryMedia[];
    onItemClick?: (item: GalleryMedia, index: number) => void;
  }) => (
    <div data-testid="gallery-grid">
      <span data-testid="item-count">{props.items.length}</span>
      {props.items.map((item, i) => (
        <button
          key={item.id}
          onClick={() => props.onItemClick?.(item, i)}
        >
          {item.id}
        </button>
      ))}
    </div>
  ),
  MediaLightbox: (props: {
    isOpen: boolean;
    initialIndex: number;
    onClose: () => void;
  }) =>
    props.isOpen ? (
      <div data-testid="lightbox">
        {props.initialIndex}
        <button onClick={props.onClose}>close lightbox</button>
      </div>
    ) : null,
}));

function makeMedia(id: string): GalleryMedia {
  return {
    id,
    user_id: "u1",
    type: "IMAGE",
    url: `https://cdn.example.com/${id}.jpg`,
    privacy: "PUBLIC",
    view_count: 0,
    created_at: "2026-01-01T00:00:00Z",
  };
}

function mockFetchOnce(response: { ok: boolean; status?: number; json?: unknown } | "reject") {
  const fn = vi.fn();
  if (response === "reject") {
    fn.mockImplementationOnce(() => Promise.reject(new Error("network down")));
  } else {
    fn.mockImplementationOnce(() =>
      Promise.resolve({
        ok: response.ok,
        status: response.status ?? (response.ok ? 200 : 500),
        json: () => Promise.resolve(response.json),
      })
    );
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe("SharedAlbumPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ token: "share-token-1" });
  });

  it("shows a loading spinner before the album resolves", () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    const { container } = render(<SharedAlbumPage />);
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("fetches the public shared-album endpoint using the token param", async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      json: {
        id: "a1",
        user_id: "u1",
        title: "Vacation",
        privacy: "PUBLIC",
        media_count: 0,
        created_at: "2026-01-01T00:00:00Z",
        media: [],
      },
    });

    render(<SharedAlbumPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/gallery/albums/shared/share-token-1"
      );
    });
  });

  it("renders the album title, description, and media count", async () => {
    mockFetchOnce({
      ok: true,
      json: {
        id: "a1",
        user_id: "u1",
        title: "Summer Vacation",
        description: "Beach trip photos",
        privacy: "PUBLIC",
        media_count: 2,
        created_at: "2026-01-01T00:00:00Z",
        media: [
          { ...makeMedia("m1"), position: 0 },
          { ...makeMedia("m2"), position: 1 },
        ],
      },
    });

    render(<SharedAlbumPage />);

    await waitFor(() => {
      expect(screen.getByText("Summer Vacation")).toBeDefined();
    });
    expect(screen.getByText("Beach trip photos")).toBeDefined();
    expect(screen.getByText("2 photos")).toBeDefined();
    expect(screen.getByTestId("item-count").textContent).toBe("2");
  });

  it("uses singular 'photo' when media_count is 1", async () => {
    mockFetchOnce({
      ok: true,
      json: {
        id: "a1",
        user_id: "u1",
        title: "Single Photo Album",
        privacy: "PUBLIC",
        media_count: 1,
        created_at: "2026-01-01T00:00:00Z",
        media: [{ ...makeMedia("m1"), position: 0 }],
      },
    });

    render(<SharedAlbumPage />);

    await waitFor(() => {
      expect(screen.getByText("1 photo")).toBeDefined();
    });
  });

  it("shows the empty-album message when there is no media", async () => {
    mockFetchOnce({
      ok: true,
      json: {
        id: "a1",
        user_id: "u1",
        title: "Empty Album",
        privacy: "PUBLIC",
        media_count: 0,
        created_at: "2026-01-01T00:00:00Z",
        media: [],
      },
    });

    render(<SharedAlbumPage />);

    await waitFor(() => {
      expect(screen.getByText("This album is empty")).toBeDefined();
    });
    expect(screen.queryByTestId("gallery-grid")).toBeNull();
  });

  it("opens the lightbox at the clicked item's index", async () => {
    mockFetchOnce({
      ok: true,
      json: {
        id: "a1",
        user_id: "u1",
        title: "Album",
        privacy: "PUBLIC",
        media_count: 2,
        created_at: "2026-01-01T00:00:00Z",
        media: [
          { ...makeMedia("m1"), position: 0 },
          { ...makeMedia("m2"), position: 1 },
        ],
      },
    });

    render(<SharedAlbumPage />);

    const secondItemButton = await screen.findByText("m2");
    expect(screen.queryByTestId("lightbox")).toBeNull();

    fireEvent.click(secondItemButton);

    await waitFor(() => {
      expect(screen.getByTestId("lightbox").textContent).toContain("1");
    });

    fireEvent.click(screen.getByText("close lightbox"));

    await waitFor(() => {
      expect(screen.queryByTestId("lightbox")).toBeNull();
    });
  });

  it("does not fetch and stays in the loading state when the token param is empty", () => {
    mockUseParams.mockReturnValue({ token: "" });
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(<SharedAlbumPage />);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("does not render a description paragraph when the album has none", async () => {
    mockFetchOnce({
      ok: true,
      json: {
        id: "a1",
        user_id: "u1",
        title: "No Description Album",
        privacy: "PUBLIC",
        media_count: 0,
        created_at: "2026-01-01T00:00:00Z",
        media: [],
      },
    });

    render(<SharedAlbumPage />);

    await waitFor(() => {
      expect(screen.getByText("No Description Album")).toBeDefined();
    });
    expect(screen.queryByText("Beach trip photos")).toBeNull();
  });

  it("shows an expired-link message on a 404 response", async () => {
    mockFetchOnce({ ok: false, status: 404 });

    render(<SharedAlbumPage />);

    await waitFor(() => {
      expect(
        screen.getByText("This album link has expired or doesn't exist")
      ).toBeDefined();
    });
    expect(screen.getByText("Album Not Available")).toBeDefined();
  });

  it("shows a generic error message on a non-404 failure status", async () => {
    mockFetchOnce({ ok: false, status: 500 });

    render(<SharedAlbumPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load album")).toBeDefined();
    });
  });

  it("shows a generic error message when the fetch throws", async () => {
    mockFetchOnce("reject");

    render(<SharedAlbumPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load album")).toBeDefined();
    });
  });
});
