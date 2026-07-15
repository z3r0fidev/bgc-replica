import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { signIn } from "next-auth/react";
import LoginPage from "../../src/app/(auth)/login/page";
import { twoFactorService } from "../../src/services/twoFactorService";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: pushMock })),
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

vi.mock("../../src/services/twoFactorService", () => ({
  twoFactorService: { verifyLogin: vi.fn() },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

function fillLoginForm(email = "user@example.com", password = "password123") {
  fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByPlaceholderText("••••••••"), {
    target: { value: password },
  });
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.cookie = "";
    global.fetch = vi.fn();
  });

  it("shows validation errors for an invalid email and empty password", async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email address.")).toBeDefined();
      expect(screen.getByText("Password is required.")).toBeDefined();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("logs in successfully, stores the token in localStorage and a cookie, and redirects home", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "tok123", token_type: "bearer" }),
    } as Response);

    render(<LoginPage />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Login successful!");
    });
    expect(localStorage.getItem("access_token")).toBe("tok123");
    expect(document.cookie).toContain("access_token=tok123");
    expect(pushMock).toHaveBeenCalledWith("/");

    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    const body = options?.body as FormData;
    expect(body.get("username")).toBe("user@example.com");
    expect(body.get("password")).toBe("password123");
  });

  it("shows an error toast when login fails", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "Invalid credentials" }),
    } as Response);

    render(<LoginPage />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
    });
    expect(pushMock).not.toHaveBeenCalled();
    expect(localStorage.getItem("access_token")).toBeNull();
  });

  it("falls back to a generic 'Login failed' message when the server sends no detail", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    render(<LoginPage />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Login failed");
    });
  });

  it("falls back to a generic 'Login failed' message when a non-Error is thrown", async () => {
    vi.mocked(global.fetch).mockRejectedValue("network exploded");

    render(<LoginPage />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Login failed");
    });
  });

  it("shows a 'Signing in...' loading state while the request is in flight", async () => {
    let resolveFn!: (v: Response) => void;
    vi.mocked(global.fetch).mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );

    render(<LoginPage />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    expect(await screen.findByText("Signing in...")).toBeDefined();

    resolveFn({ ok: true, json: async () => ({ access_token: "tok" }) } as Response);

    await waitFor(() => {
      expect(screen.queryByText("Signing in...")).toBeNull();
    });
  });

  it("switches to the 2FA view when the server requires it, without logging in yet", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ requires_2fa: true, user_id: "user-1" }),
    } as Response);

    render(<LoginPage />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      expect(screen.getByText("Two-Factor Authentication")).toBeDefined();
    });
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("submits the 2FA code via twoFactorService and completes login", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ requires_2fa: true, user_id: "user-1" }),
    } as Response);
    vi.mocked(twoFactorService.verifyLogin).mockResolvedValue({
      access_token: "tok2fa",
      token_type: "bearer",
    });

    render(<LoginPage />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));
    await waitFor(() => screen.getByText("Two-Factor Authentication"));

    fireEvent.change(
      screen.getByLabelText("Two-factor authentication verification code"),
      { target: { value: "123456" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /^verify$/i }));

    await waitFor(() => {
      expect(twoFactorService.verifyLogin).toHaveBeenCalledWith("user-1", "123456");
      expect(toast.success).toHaveBeenCalledWith("Login successful!");
    });
    expect(localStorage.getItem("access_token")).toBe("tok2fa");
    expect(document.cookie).toContain("access_token=tok2fa");
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("shows an error toast when 2FA verification fails", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ requires_2fa: true, user_id: "user-1" }),
    } as Response);
    vi.mocked(twoFactorService.verifyLogin).mockRejectedValue(
      new Error("Invalid verification code")
    );

    render(<LoginPage />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));
    await waitFor(() => screen.getByText("Two-Factor Authentication"));

    fireEvent.change(
      screen.getByLabelText("Two-factor authentication verification code"),
      { target: { value: "000000" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /^verify$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid verification code");
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("falls back to a generic 'Verification failed' message when a non-Error is thrown", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ requires_2fa: true, user_id: "user-1" }),
    } as Response);
    vi.mocked(twoFactorService.verifyLogin).mockRejectedValue("boom");

    render(<LoginPage />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));
    await waitFor(() => screen.getByText("Two-Factor Authentication"));

    fireEvent.change(
      screen.getByLabelText("Two-factor authentication verification code"),
      { target: { value: "000000" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /^verify$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Verification failed");
    });
  });

  it("does nothing when the 2FA form is submitted with an empty code", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ requires_2fa: true, user_id: "user-1" }),
    } as Response);

    render(<LoginPage />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));
    await waitFor(() => screen.getByText("Two-Factor Authentication"));

    fireEvent.click(screen.getByRole("button", { name: /^verify$/i }));

    expect(twoFactorService.verifyLogin).not.toHaveBeenCalled();
  });

  it("'Back to login' resets the 2FA state back to the regular login form", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ requires_2fa: true, user_id: "user-1" }),
    } as Response);

    render(<LoginPage />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));
    await waitFor(() => screen.getByText("Two-Factor Authentication"));

    fireEvent.click(screen.getByRole("button", { name: /back to login/i }));

    expect(
      screen.getByText("Enter your email and password to sign in")
    ).toBeDefined();
    expect(screen.queryByText("Two-Factor Authentication")).toBeNull();
  });

  it("calls signIn('google', ...) when clicking Continue with Google", async () => {
    vi.mocked(signIn).mockResolvedValue(undefined as never);
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
    });
  });

  it("shows an error toast when Google sign-in throws", async () => {
    vi.mocked(signIn).mockRejectedValue(new Error("oauth failed"));
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong with Google login");
    });
  });

  it("calls signIn('passkey', ...) when clicking Sign in with Passkey", async () => {
    vi.mocked(signIn).mockResolvedValue(undefined as never);
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /sign in with passkey/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("passkey", { callbackUrl: "/" });
    });
  });

  it("shows an error toast when passkey sign-in throws", async () => {
    vi.mocked(signIn).mockRejectedValue(new Error("passkey failed"));
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /sign in with passkey/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Passkey login failed");
    });
  });
});
