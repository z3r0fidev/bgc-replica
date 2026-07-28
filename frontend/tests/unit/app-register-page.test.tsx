import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "../../src/app/(auth)/register/page";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: pushMock })),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

function fillForm({
  name = "Jane Doe",
  username = "janedoe",
  email = "jane@example.com",
  password = "ValidPass123!",
}: { name?: string; username?: string; email?: string; password?: string } = {}) {
  fireEvent.change(screen.getByPlaceholderText("John Doe"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByPlaceholderText("johndoe"), {
    target: { value: username },
  });
  fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByPlaceholderText("••••••••"), {
    target: { value: password },
  });
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("shows a validation error when the name is too short", async () => {
    render(<RegisterPage />);
    fillForm({ name: "J" });
    fireEvent.click(screen.getByRole("button", { name: /^register$/i }));

    await waitFor(() => {
      expect(screen.getByText("Name must be at least 2 characters.")).toBeDefined();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["ab", "3-30 characters, must start with a letter, letters/numbers/underscores only."],
    ["1abc", "3-30 characters, must start with a letter, letters/numbers/underscores only."],
    ["has space", "3-30 characters, must start with a letter, letters/numbers/underscores only."],
    ["has-dash", "3-30 characters, must start with a letter, letters/numbers/underscores only."],
  ])("shows a validation error for an invalid username: %s", async (username, expectedMessage) => {
    render(<RegisterPage />);
    fillForm({ username });
    fireEvent.click(screen.getByRole("button", { name: /^register$/i }));

    await waitFor(() => {
      expect(screen.getByText(expectedMessage)).toBeDefined();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows a validation error for an invalid email", async () => {
    render(<RegisterPage />);
    fillForm({ email: "not-an-email" });
    fireEvent.click(screen.getByRole("button", { name: /^register$/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email address.")).toBeDefined();
    });
  });

  it.each([
    ["Ab1!Ab1!Ab", "Password must be at least 12 characters."],
    ["alllowercase123!", "Password must contain an uppercase letter."],
    ["ALLUPPERCASE123!", "Password must contain a lowercase letter."],
    ["NoDigitsHereBang!", "Password must contain a number."],
    ["NoSpecialChar123Ab", "Password must contain a special character."],
  ])("shows the right message for password %s", async (password, expectedMessage) => {
    render(<RegisterPage />);
    fillForm({ password });
    fireEvent.click(screen.getByRole("button", { name: /^register$/i }));

    await waitFor(() => {
      expect(screen.getByText(expectedMessage)).toBeDefined();
    });
  });

  it("registers successfully, shows a success toast, and redirects to /login", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /^register$/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Account created successfully!");
    });
    expect(pushMock).toHaveBeenCalledWith("/login");

    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    const payload = JSON.parse(options?.body as string);
    expect(payload).toEqual({
      name: "Jane Doe",
      username: "janedoe",
      email: "jane@example.com",
      password: "ValidPass123!",
    });
  });

  it("shows an error toast with the server message when registration fails", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "Email already registered" }),
    } as Response);

    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /^register$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Email already registered");
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("falls back to a generic 'Registration failed' message when the server sends no detail", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /^register$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Registration failed");
    });
  });

  it("falls back to a generic 'Registration failed' message when a non-Error is thrown", async () => {
    vi.mocked(global.fetch).mockRejectedValue("network exploded");

    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /^register$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Registration failed");
    });
  });

  it("shows a 'Creating account...' loading state while the request is in flight", async () => {
    let resolveFn!: (v: Response) => void;
    vi.mocked(global.fetch).mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );

    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /^register$/i }));

    expect(await screen.findByText("Creating account...")).toBeDefined();

    resolveFn({ ok: true, json: async () => ({}) } as Response);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });
});
