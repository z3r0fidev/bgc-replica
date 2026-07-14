import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { EmailVerificationBanner } from "../../src/components/auth/EmailVerificationBanner";
import { verificationService } from "../../src/services/verificationService";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/services/verificationService", () => ({
  verificationService: { resendVerification: vi.fn() },
}));

function mockSession(email: string | undefined | null) {
  vi.mocked(useSession).mockReturnValue({
    data: email ? { user: { email } } : null,
    status: email ? "authenticated" : "unauthenticated",
    update: vi.fn(),
  } as unknown as ReturnType<typeof useSession>);
}

describe("EmailVerificationBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders null when there is no session", () => {
    mockSession(undefined);
    const { container } = render(<EmailVerificationBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when the session has no user email", () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: {} },
      status: "authenticated",
      update: vi.fn(),
    } as unknown as ReturnType<typeof useSession>);
    const { container } = render(<EmailVerificationBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the banner when a session with an email is present", () => {
    mockSession("user@example.com");
    render(<EmailVerificationBanner />);
    expect(screen.getByText("Verify your email")).toBeDefined();
  });

  describe("dismiss", () => {
    it("renders null after dismiss is clicked and fires onDismiss", () => {
      mockSession("user@example.com");
      const onDismiss = vi.fn();
      const { container } = render(<EmailVerificationBanner onDismiss={onDismiss} />);

      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("resend", () => {
    it("calls the service and shows the returned message", async () => {
      mockSession("user@example.com");
      vi.mocked(verificationService.resendVerification).mockResolvedValue({
        message: "Verification email sent!",
      } as never);

      render(<EmailVerificationBanner />);
      const resendButton = screen.getByRole("button", { name: /resend/i });
      fireEvent.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText("Verification email sent!")).toBeDefined();
      });
      expect(verificationService.resendVerification).toHaveBeenCalledWith("user@example.com");
      expect((resendButton as HTMLButtonElement).disabled).toBe(false);
    });

    it("toggles isResending / disabled state around the call", async () => {
      mockSession("user@example.com");
      let resolvePromise: (value: { message: string }) => void;
      vi.mocked(verificationService.resendVerification).mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        }) as never
      );

      render(<EmailVerificationBanner />);
      const resendButton = screen.getByRole("button", { name: /resend/i });
      fireEvent.click(resendButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /sending/i })).toBeDefined();
      });
      expect((screen.getByRole("button", { name: /sending/i }) as HTMLButtonElement).disabled).toBe(
        true
      );

      resolvePromise!({ message: "Sent" });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^resend$/i })).toBeDefined();
      });
      expect(
        (screen.getByRole("button", { name: /^resend$/i }) as HTMLButtonElement).disabled
      ).toBe(false);
    });

    it("shows the error message on rejection instead of a success message", async () => {
      mockSession("user@example.com");
      vi.mocked(verificationService.resendVerification).mockRejectedValue(
        new Error("Please wait before requesting another verification email")
      );

      render(<EmailVerificationBanner />);
      fireEvent.click(screen.getByRole("button", { name: /resend/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Please wait before requesting another verification email")
        ).toBeDefined();
      });
    });

    it("falls back to a generic error message for non-Error rejections", async () => {
      mockSession("user@example.com");
      vi.mocked(verificationService.resendVerification).mockRejectedValue("not an error");

      render(<EmailVerificationBanner />);
      fireEvent.click(screen.getByRole("button", { name: /resend/i }));

      await waitFor(() => {
        expect(screen.getByText("Failed to send verification email")).toBeDefined();
      });
    });
  });
});
