import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UsersSearchPage from "../../src/app/(protected)/users/page";

vi.mock("next/image", () => ({
  default: (
    props: { src: string; alt: string; fill?: boolean } & Record<string, unknown>
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
    error: vi.fn(),
  },
}));
import { toast } from "sonner";

beforeAll(() => {
  // Radix Select internals touch pointer-capture/scrollIntoView APIs jsdom doesn't implement.
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();

  // jsdom has no ResizeObserver; Radix ScrollArea's internals use it.
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error test stub
  global.ResizeObserver = ResizeObserverStub;
});

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "profile-1",
    user: { name: "Alex", image: null },
    location_city: "Chicago",
    location_state: "IL",
    age: 30,
    height: "5'10\"",
    position: "Versatile",
    ethnicity: "Mixed",
    privacy_mode: "OUT",
    ...overrides,
  };
}

describe("UsersSearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it("loads results on mount and renders them", async () => {
    const items = [makeProfile({ id: "p1" })];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items }),
    });

    render(<UsersSearchPage />);

    expect(screen.getByText(/searching the community/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Alex")).toBeDefined();
    });
    expect(toast.success).toHaveBeenCalledWith("Found 1 matches");
  });

  it("shows the no-matches state when results is empty", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    render(<UsersSearchPage />);

    await waitFor(() => {
      expect(screen.getByText(/no matches found/i)).toBeDefined();
    });
  });

  it("clears results and shows a toast error when the search fetch throws", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("network"));

    render(<UsersSearchPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Search failed. Please try again.");
    });
    expect(screen.getByText(/no matches found/i)).toBeDefined();
  });

  it("falls back to a dicebear avatar and a truncated-id name when profile.user is missing image/name", async () => {
    const items = [makeProfile({ id: "abcdefgh", user: undefined })];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items }),
    });

    render(<UsersSearchPage />);

    await waitFor(() => {
      expect(screen.getByText("User abcd")).toBeDefined();
    });
    const avatar = screen.getByAltText("Avatar") as HTMLImageElement;
    expect(avatar.src).toContain("dicebear.com");
  });

  it("shows a DL badge only when privacy_mode is DOWNLO", async () => {
    const items = [makeProfile({ id: "p1", privacy_mode: "DOWNLO" })];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items }),
    });

    render(<UsersSearchPage />);

    await waitFor(() => {
      expect(screen.getByText("DL")).toBeDefined();
    });
  });

  it("links each result card to its profile detail page", async () => {
    const items = [makeProfile({ id: "p42" })];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items }),
    });

    render(<UsersSearchPage />);

    await waitFor(() => {
      expect(screen.getByRole("link").getAttribute("href")).toBe("/users/p42");
    });
  });

  it("updates the username filter as the input changes", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    render(<UsersSearchPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const usernameInput = screen.getByPlaceholderText(/full or partial/i);
    fireEvent.change(usernameInput, { target: { value: "jordan" } });
    expect((usernameInput as HTMLInputElement).value).toBe("jordan");

    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining("username=jordan"),
        expect.any(Object)
      );
    });
  });

  it("enables Reset and shows the active filter count once a filter is applied, then clears on Reset", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    render(<UsersSearchPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const resetButton = screen.getByRole("button", { name: /^reset$/i });
    expect(resetButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/full or partial/i), {
      target: { value: "jordan" },
    });

    await waitFor(() => {
      expect(resetButton).not.toBeDisabled();
    });
    expect(screen.getByText("(1)")).toBeDefined();

    fireEvent.click(resetButton);

    expect((screen.getByPlaceholderText(/full or partial/i) as HTMLInputElement).value).toBe("");
    expect(toast.success).toHaveBeenCalledWith("Filters cleared");
  });

  it("excludes the 'My Current Location' placeholder and maps trans_interested to a boolean string when applying filters", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    const geolocation = {
      getCurrentPosition: vi.fn((success: PositionCallback) => {
        success({
          coords: { latitude: 41.8, longitude: -87.6 },
        } as GeolocationPosition);
      }),
    };
    vi.stubGlobal("navigator", { ...navigator, geolocation });

    render(<UsersSearchPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Location acquired!");
    });

    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      const lastCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      const url = lastCall?.[0] as string;
      expect(url).toContain("lat=41.8");
      expect(url).toContain("lng=-87.6");
      expect(url).not.toContain("location=");
    });

    vi.unstubAllGlobals();
  });

  it("shows a toast error when geolocation is unsupported", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });
    vi.stubGlobal("navigator", { ...navigator, geolocation: undefined });

    render(<UsersSearchPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

    expect(toast.error).toHaveBeenCalledWith("Geolocation is not supported by your browser");

    vi.unstubAllGlobals();
  });

  it("shows a toast error when geolocation fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    const geolocation = {
      getCurrentPosition: vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1, message: "denied" } as GeolocationPositionError);
      }),
    };
    vi.stubGlobal("navigator", { ...navigator, geolocation });

    render(<UsersSearchPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to get location");
    });

    vi.unstubAllGlobals();
  });

  it("changes the ethnicity filter via the select dropdown and reflects it in the applied query", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    render(<UsersSearchPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const ethnicityTrigger = screen.getByText("All Ethnicities");
    fireEvent.click(ethnicityTrigger);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Black" })).toBeDefined();
    });
    fireEvent.click(screen.getByRole("option", { name: "Black" }));

    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining("ethnicity=Black"),
        expect.any(Object)
      );
    });
  });

  it("updates zipcode, distance, and city text filters and includes them in the applied query", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    render(<UsersSearchPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText("Zipcode"), {
      target: { value: "60614" },
    });
    fireEvent.change(screen.getByPlaceholderText(/or search by city/i), {
      target: { value: "Chicago" },
    });

    fireEvent.click(screen.getByText("50 miles"));
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "10 miles" })).toBeDefined();
    });
    fireEvent.click(screen.getByRole("option", { name: "10 miles" }));

    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      const lastCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      const url = lastCall?.[0] as string;
      expect(url).toContain("zipcode=60614");
      expect(url).toContain("miles=10");
      expect(url).toContain("location=Chicago");
    });
  });

  it("sets position, privacy mode, build, HIV status, and trans-interested filters and reflects them (mapping trans-interested to a boolean string) in the applied query", async () => {
    // Five sequential Radix Select open/select round-trips in one test can
    // exceed the default 5s timeout under heavy load (e.g. full-suite runs
    // with coverage instrumentation), so give this one more headroom.
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    render(<UsersSearchPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    async function selectOption(triggerText: string, optionName: string) {
      fireEvent.click(screen.getByText(triggerText));
      await waitFor(() => {
        expect(screen.getByRole("option", { name: optionName })).toBeDefined();
      });
      fireEvent.click(screen.getByRole("option", { name: optionName }));
    }

    await selectOption("All Positions", "Top");
    await selectOption("Any Privacy", "Out");
    await selectOption("Any Interest", "Yes");
    await selectOption("Any Build", "Slim");
    await selectOption("Any Status", "Positive");

    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      const lastCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      const url = lastCall?.[0] as string;
      expect(url).toContain("position=Top");
      expect(url).toContain("privacy_mode=OUT");
      expect(url).toContain("trans_interested=true");
      expect(url).toContain("build=Slim");
      expect(url).toContain("hiv_status=Positive");
    });
  }, 15000);
});
