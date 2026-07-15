import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import VerifyEmailPage from "../../src/app/(auth)/verify-email/page";
import { verificationService } from "../../src/services/verificationService";

const pushMock = vi.fn();
let searchParamsToken: string | null = null;

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({
    get: (key: string) => (key === "token" ? searchParamsToken : null),
  })),
  useRouter: vi.fn(() => ({ push: pushMock })),
}));

vi.mock("../../src/services/verificationService", () => ({
  verificationService: { verifyEmail: vi.fn() },
}));

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsToken = null;
  });

  it("shows the 'check your email' state when there is no token", () => {
    render(<VerifyEmailPage />);

    expect(screen.getByText("Check Your Email")).toBeDefined();
    expect(verificationService.verifyEmail).not.toHaveBeenCalled();
  });

  it("shows a loading state, then success, and redirects to /login after 3s", async () => {
    searchParamsToken = "tok-abc";
    vi.mocked(verificationService.verifyEmail).mockResolvedValue({
      success: true,
      message: "Your email has been verified",
    });
    const setTimeoutSpy = vi.spyOn(global, "setTimeout");

    render(<VerifyEmailPage />);
    expect(screen.getByText("Verifying your email...")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Email Verified!")).toBeDefined();
    });
    expect(verificationService.verifyEmail).toHaveBeenCalledWith("tok-abc");
    expect(screen.getByText("Your email has been verified")).toBeDefined();

    const redirectCall = setTimeoutSpy.mock.calls.find((call) => call[1] === 3000);
    expect(redirectCall).toBeDefined();
    const cb = redirectCall![0] as () => void;
    cb();
    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("shows the thrown error message on verification failure", async () => {
    searchParamsToken = "bad-token";
    vi.mocked(verificationService.verifyEmail).mockRejectedValue(
      new Error("Token expired")
    );

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText("Verification Failed")).toBeDefined();
      expect(screen.getByText("Token expired")).toBeDefined();
    });
  });

  it("shows a generic error message for non-Error rejections", async () => {
    searchParamsToken = "bad-token";
    vi.mocked(verificationService.verifyEmail).mockRejectedValue("nope");

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText("Verification failed")).toBeDefined();
    });
  });
});
