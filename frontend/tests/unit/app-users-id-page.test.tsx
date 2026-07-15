import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PublicProfilePage from "../../src/app/(protected)/users/[id]/page";

let mockId: string | undefined = "user-1";
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: mockId }),
}));

vi.mock("next/image", () => ({
  default: (
    props: { src: string; alt: string; fill?: boolean; onError?: () => void } & Record<string, unknown>
  ) => {
    const { src, alt, fill, ...rest } = props;
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...rest} />;
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
  },
}));
import { toast } from "sonner";

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    user: { name: "Jamie", image: "https://example.com/jamie.jpg" },
    location_city: "Austin",
    location_state: "TX",
    height: "6'0\"",
    ethnicity: "Latino",
    bio: "Hi there!",
    ...overrides,
  };
}

describe("PublicProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockId = "user-1";
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it("shows a loading state, then renders the fetched profile", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeProfile()),
    });

    render(<PublicProfilePage />);

    expect(screen.getByText(/loading profile/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Jamie")).toBeDefined();
    });
    expect(screen.getByText("Austin, TX")).toBeDefined();
    expect(screen.getByText("Hi there!")).toBeDefined();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/profiles/user-1"),
      expect.any(Object)
    );
  });

  it("shows 'Profile not found' when the response is not ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    });

    render(<PublicProfilePage />);

    await waitFor(() => {
      expect(screen.getByText(/profile not found/i)).toBeDefined();
    });
  });

  it("shows 'Profile not found' when the fetch throws", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("network"));

    render(<PublicProfilePage />);

    await waitFor(() => {
      expect(screen.getByText(/profile not found/i)).toBeDefined();
    });
  });

  it("falls back to defaults for missing name, location, height, ethnicity, and bio", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "user-2",
          user: undefined,
          location_city: undefined,
          location_state: undefined,
          height: undefined,
          ethnicity: undefined,
          bio: undefined,
        }),
    });

    render(<PublicProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Anonymous")).toBeDefined();
    });
    expect(screen.getByText("Earth, Anywhere")).toBeDefined();
    expect(screen.getByText("This user hasn't written a bio yet.")).toBeDefined();
    // Both Height and Ethnicity fall back to "N/A" when missing.
    expect(screen.getAllByText("N/A")).toHaveLength(2);
  });

  it("falls back to a dicebear avatar image when the profile image fails to load", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeProfile()),
    });

    render(<PublicProfilePage />);

    await waitFor(() => expect(screen.getByText("Jamie")).toBeDefined());

    const avatar = screen.getByAltText("Jamie") as HTMLImageElement;
    expect(avatar.src).toContain("jamie.jpg");

    fireEvent.error(avatar);

    await waitFor(() => {
      expect((screen.getByAltText("Jamie") as HTMLImageElement).src).toContain("dicebear.com");
    });
  });

  it("shows a toast success when the favorite button is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeProfile()),
    });

    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText("Jamie")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "" }));

    expect(toast.success).toHaveBeenCalledWith("Added to favorites!");
  });

  it("shows a toast info when the Friend button is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeProfile()),
    });

    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText("Jamie")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /friend/i }));

    expect(toast.info).toHaveBeenCalledWith("Friend request sent!");
  });

  it("does not fetch when there is no id param", async () => {
    mockId = undefined;

    render(<PublicProfilePage />);

    // loadProfile returns early without touching isLoading, so the page stays
    // in the loading state and never calls fetch.
    expect(screen.getByText(/loading profile/i)).toBeDefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
