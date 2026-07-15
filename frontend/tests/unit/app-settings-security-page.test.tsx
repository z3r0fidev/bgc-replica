import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SecuritySettingsPage from "../../src/app/(protected)/settings/security/page";
import { twoFactorService } from "../../src/services/twoFactorService";
import type { TOTPSetupResponse, TOTPStatusResponse } from "../../src/types/auth";

vi.mock("../../src/services/twoFactorService", () => ({
  twoFactorService: {
    getStatus: vi.fn(),
    setup: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    regenerateBackupCodes: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// next/image just needs to render an <img> in jsdom; QR code src is a data URI.
vi.mock("next/image", () => ({
  default: (
    props: { src: string; alt: string; unoptimized?: boolean } & Record<string, unknown>
  ) => {
    const { src, alt, unoptimized, ...rest } = props;
    void unoptimized;
    return <img src={src} alt={alt} {...rest} />;
  },
}));

import { toast } from "sonner";

const disabledStatus: TOTPStatusResponse = { enabled: false, backup_codes_remaining: null };
const enabledStatus: TOTPStatusResponse = { enabled: true, backup_codes_remaining: 8 };
const setupData: TOTPSetupResponse = {
  secret: "SECRET123",
  qr_code: "abc123base64",
  backup_codes: ["code-1", "code-2", "code-3"],
  provisioning_uri: "otpauth://totp/test",
};

describe("SecuritySettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("shows a loading spinner initially", () => {
    vi.mocked(twoFactorService.getStatus).mockReturnValue(new Promise(() => {}));
    const { container } = render(<SecuritySettingsPage />);
    expect(container.querySelector("svg.animate-spin")).not.toBeNull();
  });

  it("shows an error toast when the status fetch fails", async () => {
    vi.mocked(twoFactorService.getStatus).mockRejectedValue(new Error("nope"));
    render(<SecuritySettingsPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load 2FA status");
    });
  });

  it("renders the disabled state with an Enable button and passkey card", async () => {
    vi.mocked(twoFactorService.getStatus).mockResolvedValue(disabledStatus);
    render(<SecuritySettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^enable$/i })).toBeDefined();
    });
    expect(
      screen.getByText("Use Google Authenticator, Authy, or similar")
    ).toBeDefined();
    expect(screen.getByText("Passkeys")).toBeDefined();
  });

  it("renders the enabled state with remaining backup codes and Disable/Backup Codes buttons", async () => {
    vi.mocked(twoFactorService.getStatus).mockResolvedValue(enabledStatus);
    render(<SecuritySettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Enabled • 8 backup codes remaining/)).toBeDefined();
    });
    expect(screen.getByRole("button", { name: /disable/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /backup codes/i })).toBeDefined();
  });

  it("shows an info toast for the not-yet-implemented passkey registration", async () => {
    vi.mocked(twoFactorService.getStatus).mockResolvedValue(disabledStatus);
    render(<SecuritySettingsPage />);

    await waitFor(() => screen.getByText("Register"));
    fireEvent.click(screen.getByText("Register"));

    expect(toast.info).toHaveBeenCalledWith(
      "Passkey registration will be implemented here."
    );
  });

  describe("setup flow", () => {
    beforeEach(() => {
      vi.mocked(twoFactorService.getStatus).mockResolvedValue(disabledStatus);
    });

    it("opens the setup dialog with QR code, secret, and backup codes when Enable is clicked", async () => {
      vi.mocked(twoFactorService.setup).mockResolvedValue(setupData);
      render(<SecuritySettingsPage />);

      await waitFor(() => screen.getByRole("button", { name: /^enable$/i }));
      fireEvent.click(screen.getByRole("button", { name: /^enable$/i }));

      await waitFor(() => {
        expect(screen.getByText("Set Up Two-Factor Authentication")).toBeDefined();
      });
      expect(screen.getByText("SECRET123")).toBeDefined();
      expect(screen.getByText("code-1")).toBeDefined();
      expect(screen.getByAltText("2FA QR Code")).toHaveProperty(
        "src",
        expect.stringContaining("abc123base64")
      );
    });

    it("shows an error toast when setup fails", async () => {
      vi.mocked(twoFactorService.setup).mockRejectedValue(new Error("setup broke"));
      render(<SecuritySettingsPage />);

      await waitFor(() => screen.getByRole("button", { name: /^enable$/i }));
      fireEvent.click(screen.getByRole("button", { name: /^enable$/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("setup broke");
      });
    });

    it("copies the secret to the clipboard", async () => {
      vi.mocked(twoFactorService.setup).mockResolvedValue(setupData);
      render(<SecuritySettingsPage />);

      await waitFor(() => screen.getByRole("button", { name: /^enable$/i }));
      fireEvent.click(screen.getByRole("button", { name: /^enable$/i }));
      await waitFor(() => screen.getByText("SECRET123"));

      // The copy icon button sits next to the manual-entry code.
      const copyButtons = screen.getAllByRole("button");
      const secretCopyButton = copyButtons.find((btn) =>
        btn.querySelector("svg.lucide-copy")
      );
      fireEvent.click(secretCopyButton!);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("SECRET123");
      });
    });

    it("copies all backup codes to the clipboard", async () => {
      vi.mocked(twoFactorService.setup).mockResolvedValue(setupData);
      render(<SecuritySettingsPage />);

      await waitFor(() => screen.getByRole("button", { name: /^enable$/i }));
      fireEvent.click(screen.getByRole("button", { name: /^enable$/i }));
      await waitFor(() => screen.getByText("Copy all"));

      fireEvent.click(screen.getByText("Copy all"));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          "code-1\ncode-2\ncode-3"
        );
        expect(toast.success).toHaveBeenCalledWith("All codes copied to clipboard");
      });
    });

    it("shows an error toast when entering an invalid (short) verification code", async () => {
      vi.mocked(twoFactorService.setup).mockResolvedValue(setupData);
      render(<SecuritySettingsPage />);

      await waitFor(() => screen.getByRole("button", { name: /^enable$/i }));
      fireEvent.click(screen.getByRole("button", { name: /^enable$/i }));
      await waitFor(() => screen.getByLabelText("Enter verification code"));

      fireEvent.change(screen.getByLabelText("Enter verification code"), {
        target: { value: "123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /enable 2fa/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Please enter a valid 6-digit code");
      });
      expect(twoFactorService.enable).not.toHaveBeenCalled();
    });

    it("enables 2FA with a valid code, closes the dialog, and refetches status", async () => {
      vi.mocked(twoFactorService.setup).mockResolvedValue(setupData);
      vi.mocked(twoFactorService.enable).mockResolvedValue({
        success: true,
        message: "enabled",
      });
      render(<SecuritySettingsPage />);

      await waitFor(() => screen.getByRole("button", { name: /^enable$/i }));
      fireEvent.click(screen.getByRole("button", { name: /^enable$/i }));
      await waitFor(() => screen.getByLabelText("Enter verification code"));

      fireEvent.change(screen.getByLabelText("Enter verification code"), {
        target: { value: "123456" },
      });

      vi.mocked(twoFactorService.getStatus).mockResolvedValue(enabledStatus);
      fireEvent.click(screen.getByRole("button", { name: /enable 2fa/i }));

      await waitFor(() => {
        expect(twoFactorService.enable).toHaveBeenCalledWith("123456");
        expect(toast.success).toHaveBeenCalledWith(
          "Two-factor authentication enabled!"
        );
      });
      await waitFor(() => {
        expect(screen.queryByText("Set Up Two-Factor Authentication")).toBeNull();
      });
    });

    it("shows an error toast when enabling with a valid-length but rejected code fails", async () => {
      vi.mocked(twoFactorService.setup).mockResolvedValue(setupData);
      vi.mocked(twoFactorService.enable).mockRejectedValue(
        new Error("Invalid code")
      );
      render(<SecuritySettingsPage />);

      await waitFor(() => screen.getByRole("button", { name: /^enable$/i }));
      fireEvent.click(screen.getByRole("button", { name: /^enable$/i }));
      await waitFor(() => screen.getByLabelText("Enter verification code"));

      fireEvent.change(screen.getByLabelText("Enter verification code"), {
        target: { value: "654321" },
      });
      fireEvent.click(screen.getByRole("button", { name: /enable 2fa/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Invalid code");
      });
    });

    it("cancels the setup dialog", async () => {
      vi.mocked(twoFactorService.setup).mockResolvedValue(setupData);
      render(<SecuritySettingsPage />);

      await waitFor(() => screen.getByRole("button", { name: /^enable$/i }));
      fireEvent.click(screen.getByRole("button", { name: /^enable$/i }));
      await waitFor(() => screen.getByText("Set Up Two-Factor Authentication"));

      fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

      await waitFor(() => {
        expect(screen.queryByText("Set Up Two-Factor Authentication")).toBeNull();
      });
    });
  });

  describe("disable flow", () => {
    beforeEach(() => {
      vi.mocked(twoFactorService.getStatus).mockResolvedValue(enabledStatus);
    });

    it("shows an error toast when submitting an empty code", async () => {
      render(<SecuritySettingsPage />);
      await waitFor(() => screen.getByRole("button", { name: /disable/i }));
      fireEvent.click(screen.getByRole("button", { name: /disable/i }));

      await waitFor(() => screen.getByText("Disable Two-Factor Authentication"));
      fireEvent.click(screen.getByRole("button", { name: /^disable 2fa$/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Please enter a verification code");
      });
      expect(twoFactorService.disable).not.toHaveBeenCalled();
    });

    it("disables 2FA with a code and refetches status", async () => {
      vi.mocked(twoFactorService.disable).mockResolvedValue({
        success: true,
        message: "disabled",
      });
      render(<SecuritySettingsPage />);
      await waitFor(() => screen.getByRole("button", { name: /disable/i }));
      fireEvent.click(screen.getByRole("button", { name: /disable/i }));
      await waitFor(() => screen.getByLabelText("Verification code"));

      fireEvent.change(screen.getByLabelText("Verification code"), {
        target: { value: "111111" },
      });

      vi.mocked(twoFactorService.getStatus).mockResolvedValue(disabledStatus);
      fireEvent.click(screen.getByRole("button", { name: /^disable 2fa$/i }));

      await waitFor(() => {
        expect(twoFactorService.disable).toHaveBeenCalledWith("111111");
        expect(toast.success).toHaveBeenCalledWith(
          "Two-factor authentication disabled"
        );
      });
    });

    it("shows an error toast when disabling fails", async () => {
      vi.mocked(twoFactorService.disable).mockRejectedValue(
        new Error("wrong code")
      );
      render(<SecuritySettingsPage />);
      await waitFor(() => screen.getByRole("button", { name: /disable/i }));
      fireEvent.click(screen.getByRole("button", { name: /disable/i }));
      await waitFor(() => screen.getByLabelText("Verification code"));

      fireEvent.change(screen.getByLabelText("Verification code"), {
        target: { value: "111111" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^disable 2fa$/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("wrong code");
      });
    });

    it("cancels the disable dialog and clears the code field", async () => {
      render(<SecuritySettingsPage />);
      await waitFor(() => screen.getByRole("button", { name: /disable/i }));
      fireEvent.click(screen.getByRole("button", { name: /disable/i }));
      await waitFor(() => screen.getByLabelText("Verification code"));

      fireEvent.change(screen.getByLabelText("Verification code"), {
        target: { value: "999999" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

      await waitFor(() => {
        expect(screen.queryByText("Disable Two-Factor Authentication")).toBeNull();
      });
    });
  });

  describe("backup codes flow", () => {
    beforeEach(() => {
      vi.mocked(twoFactorService.getStatus).mockResolvedValue(enabledStatus);
    });

    it("opens the backup codes dialog in regenerate mode showing remaining count", async () => {
      render(<SecuritySettingsPage />);
      await waitFor(() => screen.getByRole("button", { name: /backup codes/i }));
      fireEvent.click(screen.getByRole("button", { name: /backup codes/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/You have 8 backup codes/)
        ).toBeDefined();
      });
    });

    it("shows an error toast when regenerating with an empty code", async () => {
      render(<SecuritySettingsPage />);
      await waitFor(() => screen.getByRole("button", { name: /backup codes/i }));
      fireEvent.click(screen.getByRole("button", { name: /backup codes/i }));
      await waitFor(() => screen.getByRole("button", { name: /regenerate codes/i }));

      fireEvent.click(screen.getByRole("button", { name: /regenerate codes/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Please enter your 2FA code");
      });
      expect(twoFactorService.regenerateBackupCodes).not.toHaveBeenCalled();
    });

    it("regenerates backup codes and switches the dialog to display the new codes", async () => {
      vi.mocked(twoFactorService.regenerateBackupCodes).mockResolvedValue({
        backup_codes: ["new-1", "new-2"],
      });
      render(<SecuritySettingsPage />);
      await waitFor(() => screen.getByRole("button", { name: /backup codes/i }));
      fireEvent.click(screen.getByRole("button", { name: /backup codes/i }));
      await waitFor(() => screen.getByLabelText("Authenticator code"));

      fireEvent.change(screen.getByLabelText("Authenticator code"), {
        target: { value: "222222" },
      });
      fireEvent.click(screen.getByRole("button", { name: /regenerate codes/i }));

      await waitFor(() => {
        expect(twoFactorService.regenerateBackupCodes).toHaveBeenCalledWith("222222");
        expect(toast.success).toHaveBeenCalledWith("Backup codes regenerated");
      });
      expect(screen.getByText("new-1")).toBeDefined();
      expect(
        screen.getByText(/Save these new backup codes securely/)
      ).toBeDefined();
      // "Done" replaces "Regenerate Codes" / "Cancel" once new codes are shown.
      expect(screen.getByRole("button", { name: /^done$/i })).toBeDefined();
    });

    it("shows an error toast when regenerating backup codes fails", async () => {
      vi.mocked(twoFactorService.regenerateBackupCodes).mockRejectedValue(
        new Error("regen failed")
      );
      render(<SecuritySettingsPage />);
      await waitFor(() => screen.getByRole("button", { name: /backup codes/i }));
      fireEvent.click(screen.getByRole("button", { name: /backup codes/i }));
      await waitFor(() => screen.getByLabelText("Authenticator code"));

      fireEvent.change(screen.getByLabelText("Authenticator code"), {
        target: { value: "333333" },
      });
      fireEvent.click(screen.getByRole("button", { name: /regenerate codes/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("regen failed");
      });
    });

    it("resets state when closing the backup codes dialog after generating new codes", async () => {
      vi.mocked(twoFactorService.regenerateBackupCodes).mockResolvedValue({
        backup_codes: ["new-1"],
      });
      render(<SecuritySettingsPage />);
      await waitFor(() => screen.getByRole("button", { name: /backup codes/i }));
      fireEvent.click(screen.getByRole("button", { name: /backup codes/i }));
      await waitFor(() => screen.getByLabelText("Authenticator code"));

      fireEvent.change(screen.getByLabelText("Authenticator code"), {
        target: { value: "444444" },
      });
      fireEvent.click(screen.getByRole("button", { name: /regenerate codes/i }));
      await waitFor(() => screen.getByRole("button", { name: /^done$/i }));

      fireEvent.click(screen.getByRole("button", { name: /^done$/i }));

      await waitFor(() => {
        expect(screen.queryByText("new-1")).toBeNull();
      });
    });

    it("copies the newly generated backup codes to the clipboard", async () => {
      vi.mocked(twoFactorService.regenerateBackupCodes).mockResolvedValue({
        backup_codes: ["new-1", "new-2"],
      });
      render(<SecuritySettingsPage />);
      await waitFor(() => screen.getByRole("button", { name: /backup codes/i }));
      fireEvent.click(screen.getByRole("button", { name: /backup codes/i }));
      await waitFor(() => screen.getByLabelText("Authenticator code"));

      fireEvent.change(screen.getByLabelText("Authenticator code"), {
        target: { value: "555555" },
      });
      fireEvent.click(screen.getByRole("button", { name: /regenerate codes/i }));
      await waitFor(() => screen.getByText("new-1"));

      fireEvent.click(screen.getByText("Copy all"));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("new-1\nnew-2");
      });
    });

    it("resets state when the backup codes dialog is dismissed via Escape (Radix onOpenChange)", async () => {
      vi.mocked(twoFactorService.regenerateBackupCodes).mockResolvedValue({
        backup_codes: ["esc-1"],
      });
      render(<SecuritySettingsPage />);
      await waitFor(() => screen.getByRole("button", { name: /backup codes/i }));
      fireEvent.click(screen.getByRole("button", { name: /backup codes/i }));
      await waitFor(() => screen.getByLabelText("Authenticator code"));

      fireEvent.change(screen.getByLabelText("Authenticator code"), {
        target: { value: "666666" },
      });
      fireEvent.click(screen.getByRole("button", { name: /regenerate codes/i }));
      await waitFor(() => screen.getByText("esc-1"));

      // Radix's Dialog calls onOpenChange(false) on Escape, distinct from the
      // page's own "Done" button handler.
      fireEvent.keyDown(screen.getByText("esc-1"), { key: "Escape", code: "Escape" });

      await waitFor(() => {
        expect(screen.queryByText("esc-1")).toBeNull();
      });
    });
  });
});
