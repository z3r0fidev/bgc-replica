import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import UserGalleryPage from "../../src/app/(protected)/profile/[id]/gallery/page";
import type { GalleryMedia } from "../../src/types/gallery";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

let capturedOnItemClick:
  | ((item: GalleryMedia, index: number) => void)
  | undefined;
let capturedOnLoadMore: (() => void) | undefined;

vi.mock("../../src/components/gallery", () => ({
  GalleryGrid: ({
    items,
    onItemClick,
    onLoadMore,
  }: {
    items: GalleryMedia[];
    onItemClick?: (item: GalleryMedia, index: number) => void;
    onLoadMore?: () => void;
  }) => {
    capturedOnItemClick = onItemClick;
    capturedOnLoadMore = onLoadMore;
    return <div data-testid="gallery-grid">{items.length} rendered</div>;
  },
  MediaLightbox: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) => (
    <div data-testid="media-lightbox">
      {isOpen ? "open" : "closed"}
      <button onClick={onClose}>close-lightbox</button>
    </div>
  ),
}));

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

function makeMedia(overrides: Partial<GalleryMedia> = {}): GalleryMedia {
  return {
    id: "media-1",
    user_id: "user-1",
    type: "IMAGE",
    url: "https://example.com/img.jpg",
    privacy: "PUBLIC",
    view_count: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("UserGalleryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnItemClick = undefined;
    capturedOnLoadMore = undefined;
    localStorage.clear();
    vi.mocked(useParams).mockReturnValue({ id: "user-1" });
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
    } as ReturnType<typeof useSession>);
    global.fetch = vi.fn();
  });

  it("shows a loading spinner while the initial fetch is in flight", () => {
    vi.mocked(global.fetch).mockReturnValue(new Promise(() => {}));
    const { container } = render(<UserGalleryPage />);
    expect(container.querySelector("svg.animate-spin")).not.toBeNull();
  });

  it("renders the gallery grid with fetched items and the total count", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [makeMedia(), makeMedia({ id: "media-2" })],
        total_count: 2,
        next_cursor: null,
      }),
    } as Response);
    render(<UserGalleryPage />);

    await waitFor(() => {
      expect(screen.getByText("2 items")).toBeDefined();
    });
    expect(screen.getByTestId("gallery-grid").textContent).toBe("2 rendered");
  });

  it("shows the empty state when there are no items", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total_count: 0, next_cursor: null }),
    } as Response);
    render(<UserGalleryPage />);

    await waitFor(() => {
      expect(screen.getByText("No public media")).toBeDefined();
    });
  });

  it("treats a 404 response as an empty gallery without erroring", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);
    render(<UserGalleryPage />);

    await waitFor(() => {
      expect(screen.getByText("No public media")).toBeDefined();
    });
    const { toast } = await import("sonner");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows an error toast on a non-404 failure", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);
    render(<UserGalleryPage />);

    const { toast } = await import("sonner");
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load gallery");
    });
  });

  it("shows owner-only UI (My Gallery heading and Manage Gallery button) when viewing your own gallery", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-1" } },
      status: "authenticated",
    } as ReturnType<typeof useSession>);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total_count: 0, next_cursor: null }),
    } as Response);
    render(<UserGalleryPage />);

    await waitFor(() => {
      expect(screen.getByText("My Gallery")).toBeDefined();
    });
    expect(screen.getByText("Manage Gallery")).toBeDefined();
  });

  it("shows the plain 'Gallery' heading for a non-owner viewer", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total_count: 0, next_cursor: null }),
    } as Response);
    render(<UserGalleryPage />);

    await waitFor(() => {
      expect(screen.getByText("Gallery")).toBeDefined();
    });
    expect(screen.queryByText("Manage Gallery")).toBeNull();
  });

  it("sends the Authorization header when an access token is present", async () => {
    localStorage.setItem("access_token", "tok-abc");
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total_count: 0, next_cursor: null }),
    } as Response);
    render(<UserGalleryPage />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    expect((options?.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok-abc"
    );
  });

  it("refetches with a type filter when switching tabs", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total_count: 0, next_cursor: null }),
    } as Response);
    render(<UserGalleryPage />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    // Radix's TabsTrigger switches tabs on mousedown, not click.
    fireEvent.mouseDown(screen.getByRole("tab", { name: /photos/i }), { button: 0 });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const [url] = vi.mocked(global.fetch).mock.calls[1];
    expect(String(url)).toContain("type=IMAGE");
  });

  it("loads more items and appends them using the next cursor", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [makeMedia({ id: "media-1" })],
          total_count: 2,
          next_cursor: "cursor-2",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [makeMedia({ id: "media-2" })],
          total_count: 2,
          next_cursor: null,
        }),
      } as Response);
    render(<UserGalleryPage />);

    await waitFor(() => screen.getByText("Load More"));
    fireEvent.click(screen.getByText("Load More"));

    await waitFor(() => {
      expect(screen.getByTestId("gallery-grid").textContent).toBe("2 rendered");
    });
    const [secondUrl] = vi.mocked(global.fetch).mock.calls[1];
    expect(String(secondUrl)).toContain("cursor=cursor-2");
  });

  it("opens the lightbox when an item is clicked in the grid", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [makeMedia()],
        total_count: 1,
        next_cursor: null,
      }),
    } as Response);
    render(<UserGalleryPage />);

    await waitFor(() => expect(capturedOnItemClick).toBeDefined());
    expect(screen.getByTestId("media-lightbox").textContent).toContain("closed");

    act(() => {
      capturedOnItemClick!(makeMedia(), 0);
    });

    await waitFor(() => {
      expect(screen.getByTestId("media-lightbox").textContent).toContain("open");
    });

    fireEvent.click(screen.getByText("close-lightbox"));

    await waitFor(() => {
      expect(screen.getByTestId("media-lightbox").textContent).toContain("closed");
    });
  });

  it("invokes onLoadMore passthrough from the grid when there's a next cursor", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [makeMedia()],
          total_count: 2,
          next_cursor: "cursor-2",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [makeMedia({ id: "media-2" })],
          total_count: 2,
          next_cursor: null,
        }),
      } as Response);
    render(<UserGalleryPage />);

    await waitFor(() => expect(capturedOnLoadMore).toBeDefined());
    capturedOnLoadMore!();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
