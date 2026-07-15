import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetPasswordPage from "../../src/app/(auth)/reset-password/page";
import { passwordResetService } from "../../src/services/passwordResetService";

const pushMock = vi.fn();
let searchParamsToken: string | null = "tok-abc";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({
    get: (key: string) => (key === "token" ? searchParamsToken : null),
  })),
  useRouter: vi.fn(() => ({ push: pushMock })),
}));

vi.mock("../../src/services/passwordResetService", () => ({
  passwordResetService: { resetPassword: vi.fn() },
}));

function fillPasswords(password: string, confirmPassword: string = password) {
  fireEvent.change(screen.getByLabelText(/^new password$/i), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText(/confirm password/i), {
    target: { value: confirmPassword },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /^reset password$/i }));
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsToken = "tok-abc";
  });

  it("shows the invalid-link screen when there is no token", () => {
    searchParamsToken = null;
    render(<ResetPasswordPage />);

    expect(screen.getByText("Invalid Reset Link")).toBeDefined();
    expect(screen.getByRole("link", { name: /request a new link/i })).toBeDefined();
  });

  it.each([
    ["Ab1!Ab1!Ab", "Password must be at least 12 characters"],
    ["alllowercase123!", "Password must contain at least one uppercase letter"],
    ["ALLUPPERCASE123!", "Password must contain at least one lowercase letter"],
    ["NoDigitsHereBang!", "Password must contain at least one digit"],
    ["NoSpecialChar123Ab", "Password must contain at least one special character"],
  ])("shows the right validation error for %s", async (password, expectedMessage) => {
    render(<ResetPasswordPage />);
    fillPasswords(password);
    submit();

    await waitFor(() => {
      expect(screen.getByText(expectedMessage)).toBeDefined();
    });
    expect(passwordResetService.resetPassword).not.toHaveBeenCalled();
  });

  it("shows an error when the passwords do not match", async () => {
    render(<ResetPasswordPage />);
    fillPasswords("ValidPass123!", "DifferentPass123!");
    submit();

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeDefined();
    });
    expect(passwordResetService.resetPassword).not.toHaveBeenCalled();
  });

  it("toggles password visibility when the eye icon button is clicked", () => {
    render(<ResetPasswordPage />);
    const passwordInput = screen.getByLabelText(/^new password$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleButton = passwordInput.parentElement!.querySelector(
      "button"
    ) as HTMLButtonElement;
    fireEvent.click(toggleButton);

    expect(passwordInput.type).toBe("text");
  });

  it("resets the password and shows the success screen", async () => {
    vi.mocked(passwordResetService.resetPassword).mockResolvedValue({
      success: true,
      message: "ok",
    });

    render(<ResetPasswordPage />);
    fillPasswords("ValidPass123!");
    submit();

    await waitFor(() => {
      expect(screen.getByText("Password Reset!")).toBeDefined();
    });
    expect(passwordResetService.resetPassword).toHaveBeenCalledWith(
      "tok-abc",
      "ValidPass123!"
    );
  });

  it("redirects to /login 3 seconds after a successful reset", async () => {
    vi.mocked(passwordResetService.resetPassword).mockResolvedValue({
      success: true,
      message: "ok",
    });
    const setTimeoutSpy = vi.spyOn(global, "setTimeout");

    render(<ResetPasswordPage />);
    fillPasswords("ValidPass123!");
    submit();

    await waitFor(() => {
      expect(screen.getByText("Password Reset!")).toBeDefined();
    });

    const redirectCall = setTimeoutSpy.mock.calls.find((call) => call[1] === 3000);
    expect(redirectCall).toBeDefined();
    const cb = redirectCall![0] as () => void;
    cb();

    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("shows the thrown error message when the reset fails", async () => {
    vi.mocked(passwordResetService.resetPassword).mockRejectedValue(
      new Error("Reset token expired")
    );

    render(<ResetPasswordPage />);
    fillPasswords("ValidPass123!");
    submit();

    await waitFor(() => {
      expect(screen.getByText("Reset token expired")).toBeDefined();
    });
  });

  it("shows a generic error message when a non-Error is thrown", async () => {
    vi.mocked(passwordResetService.resetPassword).mockRejectedValue("boom");

    render(<ResetPasswordPage />);
    fillPasswords("ValidPass123!");
    submit();

    await waitFor(() => {
      expect(screen.getByText("Failed to reset password")).toBeDefined();
    });
  });

  it("shows a 'Resetting...' loading state while the request is in flight", async () => {
    let resolveFn!: (v: { success: boolean; message: string }) => void;
    vi.mocked(passwordResetService.resetPassword).mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );

    render(<ResetPasswordPage />);
    fillPasswords("ValidPass123!");
    submit();

    expect(await screen.findByText("Resetting...")).toBeDefined();

    resolveFn({ success: true, message: "ok" });

    await waitFor(() => {
      expect(screen.getByText("Password Reset!")).toBeDefined();
    });
  });
});
