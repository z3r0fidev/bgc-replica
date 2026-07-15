import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReportDialog } from "../../src/components/moderation/ReportDialog";

vi.mock("../../src/services/blockService", () => ({
  blockService: {
    reportUser: vi.fn(),
  },
}));

import { blockService } from "../../src/services/blockService";

describe("ReportDialog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders the reporting user's name and the reason options", () => {
    render(
      <ReportDialog userId="u-1" userName="Jane Doe" open={true} onOpenChange={vi.fn()} />
    );
    expect(screen.getByText(/report jane doe/i)).toBeDefined();
    expect(screen.getByText("Harassment or bullying")).toBeDefined();
    expect(screen.getByText("Spam or scam")).toBeDefined();
    expect(screen.getByText("Inappropriate content")).toBeDefined();
    expect(screen.getByText("Fake or misleading profile")).toBeDefined();
    expect(screen.getByText("Other")).toBeDefined();
  });

  it("does not show the details textarea until a reason is selected", () => {
    render(
      <ReportDialog userId="u-1" userName="Jane Doe" open={true} onOpenChange={vi.fn()} />
    );
    expect(screen.queryByLabelText(/additional details/i)).toBeNull();
  });

  it("disables Submit until a reason is chosen", () => {
    render(
      <ReportDialog userId="u-1" userName="Jane Doe" open={true} onOpenChange={vi.fn()} />
    );
    const submitButton = screen.getByRole("button", { name: /submit report/i });
    expect(submitButton).toHaveProperty("disabled", true);
  });

  it("selecting a reason enables the details textarea and the submit button", () => {
    render(
      <ReportDialog userId="u-1" userName="Jane Doe" open={true} onOpenChange={vi.fn()} />
    );
    fireEvent.click(screen.getByText("Spam or scam"));

    expect(screen.getByLabelText(/additional details/i)).toBeDefined();
    const submitButton = screen.getByRole("button", { name: /submit report/i });
    expect(submitButton).toHaveProperty("disabled", false);
  });

  it("submits with details: undefined when the textarea is left empty", async () => {
    vi.mocked(blockService.reportUser).mockResolvedValue(undefined);
    const handleOpenChange = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <ReportDialog
        userId="u-1"
        userName="Jane Doe"
        open={true}
        onOpenChange={handleOpenChange}
        onReportSuccess={handleSuccess}
      />
    );

    fireEvent.click(screen.getByText("Spam or scam"));
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(blockService.reportUser).toHaveBeenCalledWith({
        user_id: "u-1",
        reason: "SPAM",
        details: undefined,
      });
    });

    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(handleSuccess).toHaveBeenCalledTimes(1);
  });

  it("submits with the entered details text when provided", async () => {
    vi.mocked(blockService.reportUser).mockResolvedValue(undefined);

    render(
      <ReportDialog userId="u-1" userName="Jane Doe" open={true} onOpenChange={vi.fn()} />
    );

    fireEvent.click(screen.getByText("Harassment or bullying"));
    fireEvent.change(screen.getByLabelText(/additional details/i), {
      target: { value: "They kept messaging me repeatedly." },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(blockService.reportUser).toHaveBeenCalledWith({
        user_id: "u-1",
        reason: "HARASSMENT",
        details: "They kept messaging me repeatedly.",
      });
    });
  });

  it("resets selectedReason and details after a successful submission", async () => {
    vi.mocked(blockService.reportUser).mockResolvedValue(undefined);
    const handleOpenChange = vi.fn();

    render(
      <ReportDialog userId="u-1" userName="Jane Doe" open={true} onOpenChange={handleOpenChange} />
    );

    fireEvent.click(screen.getByText("Other"));
    fireEvent.change(screen.getByLabelText(/additional details/i), {
      target: { value: "some details" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => expect(handleOpenChange).toHaveBeenCalledWith(false));

    // After reset, the details textarea should no longer render (no reason selected)
    // and the submit button should be disabled again on the same mounted instance.
    expect(screen.queryByLabelText(/additional details/i)).toBeNull();
    expect(screen.getByRole("button", { name: /submit report/i })).toHaveProperty(
      "disabled",
      true
    );
  });

  it("shows an inline error and keeps the dialog open when the submission fails", async () => {
    vi.mocked(blockService.reportUser).mockRejectedValue(new Error("Report failed: rate limited"));
    const handleOpenChange = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <ReportDialog
        userId="u-1"
        userName="Jane Doe"
        open={true}
        onOpenChange={handleOpenChange}
        onReportSuccess={handleSuccess}
      />
    );

    fireEvent.click(screen.getByText("Spam or scam"));
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText("Report failed: rate limited")).toBeDefined();
    });

    expect(handleOpenChange).not.toHaveBeenCalled();
    expect(handleSuccess).not.toHaveBeenCalled();
    // The selected reason (and its highlighted state) persists after a failure.
    expect(screen.getByRole("button", { name: /submit report/i })).toHaveProperty(
      "disabled",
      false
    );
  });

  it("falls back to a generic error message for a non-Error rejection", async () => {
    vi.mocked(blockService.reportUser).mockRejectedValue("network blip");

    render(
      <ReportDialog userId="u-1" userName="Jane Doe" open={true} onOpenChange={vi.fn()} />
    );

    fireEvent.click(screen.getByText("Fake or misleading profile"));
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to submit report")).toBeDefined();
    });
  });

  it("shows 'Submitting...' while the request is in flight", async () => {
    let resolveReport!: () => void;
    vi.mocked(blockService.reportUser).mockReturnValue(
      new Promise((resolve) => {
        resolveReport = resolve;
      })
    );

    render(
      <ReportDialog userId="u-1" userName="Jane Doe" open={true} onOpenChange={vi.fn()} />
    );

    fireEvent.click(screen.getByText("Spam or scam"));
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    expect(screen.getByText("Submitting...")).toBeDefined();

    resolveReport();
    await waitFor(() => {
      expect(screen.queryByText("Submitting...")).toBeNull();
    });
  });

  it("Cancel calls onOpenChange(false) without submitting and resets the selected reason", () => {
    const handleOpenChange = vi.fn();
    render(
      <ReportDialog userId="u-1" userName="Jane Doe" open={true} onOpenChange={handleOpenChange} />
    );

    fireEvent.click(screen.getByText("Spam or scam"));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(blockService.reportUser).not.toHaveBeenCalled();
  });

  it("visually highlights the selected reason button", () => {
    render(
      <ReportDialog userId="u-1" userName="Jane Doe" open={true} onOpenChange={vi.fn()} />
    );
    const button = screen.getByText("Inappropriate content");
    expect(button.className).not.toContain("border-primary");
    fireEvent.click(button);
    expect(button.className).toContain("border-primary");
  });

  it("closes via Dialog onOpenChange (e.g. Escape key) and resets state", () => {
    const handleOpenChange = vi.fn();
    render(
      <ReportDialog userId="u-1" userName="Jane Doe" open={true} onOpenChange={handleOpenChange} />
    );

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
