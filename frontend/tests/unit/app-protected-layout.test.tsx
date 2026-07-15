import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import ProtectedLayout from "../../src/app/(protected)/layout";
import { verificationService } from "../../src/services/verificationService";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("../../src/services/verificationService", () => ({
  verificationService: {
    getVerificationStatus: vi.fn(),
    resendVerification: vi.fn(),
  },
}));

function mockSession(email: string | null) {
  vi.mocked(useSession).mockReturnValue({
    data: email ? { user: { email } } : null,
    status: email ? "authenticated" : "unauthenticated",
    update: vi.fn(),
  } as unknown as ReturnType<typeof useSession>);
}

describe("ProtectedLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession("user@example.com");
  });

  it("renders children inside main and checks verification status on mount", async () => {
    vi.mocked(verificationService.getVerificationStatus).mockResolvedValue({
      email_verified: true,
      verified_at: "2024-01-01T00:00:00Z",
    });

    render(
      <ProtectedLayout>
        <div>page content</div>
      </ProtectedLayout>
    );

    expect(screen.getByText("page content")).toBeDefined();
    await waitFor(() => {
      expect(verificationService.getVerificationStatus).toHaveBeenCalled();
    });
  });

  it("does not show the banner when the email is verified", async () => {
    vi.mocked(verificationService.getVerificationStatus).mockResolvedValue({
      email_verified: true,
      verified_at: "2024-01-01T00:00:00Z",
    });

    render(<ProtectedLayout>{null}</ProtectedLayout>);

    await waitFor(() => {
      expect(verificationService.getVerificationStatus).toHaveBeenCalled();
    });
    expect(screen.queryByText("Verify your email")).toBeNull();
  });

  it("shows the banner when the email is not verified", async () => {
    vi.mocked(verificationService.getVerificationStatus).mockResolvedValue({
      email_verified: false,
      verified_at: null,
    });

    render(<ProtectedLayout>{null}</ProtectedLayout>);

    await waitFor(() => {
      expect(screen.getByText("Verify your email")).toBeDefined();
    });
  });

  it("fails closed: does not show the banner (and does not crash) when the status call throws", async () => {
    vi.mocked(verificationService.getVerificationStatus).mockRejectedValue(
      new Error("network error")
    );

    render(<ProtectedLayout>{null}</ProtectedLayout>);

    await waitFor(() => {
      expect(verificationService.getVerificationStatus).toHaveBeenCalled();
    });
    expect(screen.queryByText("Verify your email")).toBeNull();
  });

  it("dismissing the banner hides it (onDismiss -> setShowBanner(false))", async () => {
    vi.mocked(verificationService.getVerificationStatus).mockResolvedValue({
      email_verified: false,
      verified_at: null,
    });

    render(<ProtectedLayout>{null}</ProtectedLayout>);

    await waitFor(() => {
      expect(screen.getByText("Verify your email")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText("Verify your email")).toBeNull();
  });
});
