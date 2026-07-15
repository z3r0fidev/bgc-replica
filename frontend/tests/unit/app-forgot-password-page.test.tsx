import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForgotPasswordPage from "../../src/app/(auth)/forgot-password/page";
import { passwordResetService } from "../../src/services/passwordResetService";

vi.mock("../../src/services/passwordResetService", () => ({
  passwordResetService: { requestReset: vi.fn() },
}));

function fillAndSubmit(email = "user@example.com") {
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests a password reset and shows the confirmation screen with the entered email", async () => {
    vi.mocked(passwordResetService.requestReset).mockResolvedValue({
      success: true,
      message: "sent",
    });

    render(<ForgotPasswordPage />);
    fillAndSubmit("jane@example.com");

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });
    expect(passwordResetService.requestReset).toHaveBeenCalledWith("jane@example.com");
    expect(screen.getByText("jane@example.com")).toBeDefined();
  });

  it("shows the thrown error message when the request fails", async () => {
    vi.mocked(passwordResetService.requestReset).mockRejectedValue(
      new Error("Please wait before requesting another password reset")
    );

    render(<ForgotPasswordPage />);
    fillAndSubmit();

    await waitFor(() => {
      expect(
        screen.getByText("Please wait before requesting another password reset")
      ).toBeDefined();
    });
  });

  it("shows a generic error message for non-Error rejections", async () => {
    vi.mocked(passwordResetService.requestReset).mockRejectedValue("boom");

    render(<ForgotPasswordPage />);
    fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeDefined();
    });
  });

  it("lets the user try another email after success, resetting the form", async () => {
    vi.mocked(passwordResetService.requestReset).mockResolvedValue({
      success: true,
      message: "sent",
    });

    render(<ForgotPasswordPage />);
    fillAndSubmit("jane@example.com");

    await waitFor(() => expect(screen.getByText("Check your email")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: /try another email/i }));

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    expect(emailInput.value).toBe("");
  });

  it("shows a 'Sending...' state on the submit button while the request is in flight", async () => {
    let resolveFn!: (v: { success: boolean; message: string }) => void;
    vi.mocked(passwordResetService.requestReset).mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );

    render(<ForgotPasswordPage />);
    fillAndSubmit();

    expect(await screen.findByText("Sending...")).toBeDefined();

    resolveFn({ success: true, message: "sent" });

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });
  });
});
