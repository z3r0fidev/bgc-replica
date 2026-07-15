import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RatingStars } from "../../src/components/profile/rating-stars";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

function mockFetchOnce(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("RatingStars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("access_token", "test-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("renders 10 stars", () => {
    render(<RatingStars userId="user-1" />);
    // Each star is a button
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(10);
  });

  it("shows the initial rating in the average label", () => {
    render(<RatingStars userId="user-1" initialRating={4.5} />);
    expect(screen.getByText("Average: 4.5 / 10")).toBeDefined();
  });

  it("defaults the rating to 0.0 when no initialRating is given", () => {
    render(<RatingStars userId="user-1" />);
    expect(screen.getByText("Average: 0.0 / 10")).toBeDefined();
  });

  it("submits a rating on star click and updates the average from the response", async () => {
    mockFetchOnce({ average_rating: 7.3 });
    render(<RatingStars userId="user-42" />);

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[6]); // 7th star -> score 7

    await waitFor(() => {
      expect(screen.getByText("Average: 7.3 / 10")).toBeDefined();
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/profiles/user-42/rate"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ score: 7 }),
      })
    );
    expect(toast.success).toHaveBeenCalledWith("Rating submitted!");
  });

  it("calls onRate with the new average on success", async () => {
    mockFetchOnce({ average_rating: 9.1 });
    const onRate = vi.fn();
    render(<RatingStars userId="user-1" onRate={onRate} />);

    fireEvent.click(screen.getAllByRole("button")[0]);

    await waitFor(() => {
      expect(onRate).toHaveBeenCalledWith(9.1);
    });
  });

  it("shows a toast error and does not crash when the rating request fails", async () => {
    mockFetchOnce({}, false);
    render(<RatingStars userId="user-1" />);

    fireEvent.click(screen.getAllByRole("button")[2]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Rating failed");
    });
  });

  it("shows the fetch's own error message when the underlying request itself rejects with a non-Error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue("network exploded"));
    render(<RatingStars userId="user-1" />);

    fireEvent.click(screen.getAllByRole("button")[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Rating failed");
    });
  });

  it("highlights stars up to the hovered value, then reverts to the rating on mouse leave", () => {
    render(<RatingStars userId="user-1" initialRating={2} />);
    const buttons = screen.getAllByRole("button");

    fireEvent.mouseEnter(buttons[6]); // hover over the 7th star
    let filledStars = buttons.filter((b) =>
      b.querySelector("svg")?.getAttribute("class")?.includes("fill-yellow-400")
    );
    expect(filledStars.length).toBe(7);

    fireEvent.mouseLeave(buttons[6]);
    filledStars = buttons.filter((b) =>
      b.querySelector("svg")?.getAttribute("class")?.includes("fill-yellow-400")
    );
    // Falls back to the initial rating (2) once hover ends
    expect(filledStars.length).toBe(2);
  });

  it("disables the star buttons while a submission is in flight", async () => {
    let resolveFetch!: (v: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = () =>
            resolve({ ok: true, json: async () => ({ average_rating: 5 }) });
        })
      )
    );

    render(<RatingStars userId="user-1" />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[3]);

    await waitFor(() => {
      expect(buttons[0]).toHaveProperty("disabled", true);
    });

    resolveFetch(undefined);

    await waitFor(() => {
      expect(buttons[0]).toHaveProperty("disabled", false);
    });
  });
});
