import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UsernameCard } from "../../src/components/profile/UsernameCard";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

describe("UsernameCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it("fetches and displays the current username", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ username: "existinguser" }),
    });

    render(<UsernameCard />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("existinguser")).toBeDefined();
    });
    expect(global.fetch).toHaveBeenCalledWith("/api/auth/me", expect.any(Object));
  });

  it("shows a toast error when fetching the username fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false });

    render(<UsernameCard />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load username");
    });
  });

  it("disables Save until the value changes", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ username: "existinguser" }),
    });

    render(<UsernameCard />);
    await waitFor(() => expect(screen.getByDisplayValue("existinguser")).toBeDefined());

    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();

    fireEvent.change(screen.getByDisplayValue("existinguser"), {
      target: { value: "newname" },
    });

    expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled();
  });

  it("shows a client-side validation error for an invalid format without calling the API", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ username: "existinguser" }),
    });

    render(<UsernameCard />);
    await waitFor(() => expect(screen.getByDisplayValue("existinguser")).toBeDefined());

    fireEvent.change(screen.getByDisplayValue("existinguser"), {
      target: { value: "1invalid" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      screen.getByText(/3-30 characters, must start with a letter/i)
    ).toBeDefined();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("saves a new username and shows a success toast", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ username: "existinguser" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ username: "newname" }),
      });

    render(<UsernameCard />);
    await waitFor(() => expect(screen.getByDisplayValue("existinguser")).toBeDefined());

    fireEvent.change(screen.getByDisplayValue("existinguser"), {
      target: { value: "newname" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "/api/auth/username",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ username: "newname" }),
        })
      );
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Username updated");
    });
  });

  it("shows the server's error message when saving fails (e.g. already taken)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ username: "existinguser" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: "Username already taken" }),
      });

    render(<UsernameCard />);
    await waitFor(() => expect(screen.getByDisplayValue("existinguser")).toBeDefined());

    fireEvent.change(screen.getByDisplayValue("existinguser"), {
      target: { value: "taken" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Username already taken");
    });
  });
});
