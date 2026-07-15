import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BlockConfirmDialog } from "../../src/components/moderation/BlockConfirmDialog";

describe("BlockConfirmDialog", () => {
  it("renders the target user's name and the consequences of blocking", () => {
    render(
      <BlockConfirmDialog userName="Jane Doe" open={true} onOpenChange={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.getByText(/block jane doe\?/i)).toBeDefined();
    expect(screen.getByText(/won't be able to message you/i)).toBeDefined();
  });

  it("does not render dialog content when closed", () => {
    render(
      <BlockConfirmDialog userName="Jane Doe" open={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.queryByText(/block jane doe\?/i)).toBeNull();
  });

  it("Cancel calls onOpenChange(false) without calling onConfirm", () => {
    const handleOpenChange = vi.fn();
    const handleConfirm = vi.fn();
    render(
      <BlockConfirmDialog
        userName="Jane Doe"
        open={true}
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it("Block User calls both onConfirm and onOpenChange(false)", () => {
    const handleOpenChange = vi.fn();
    const handleConfirm = vi.fn();
    render(
      <BlockConfirmDialog
        userName="Jane Doe"
        open={true}
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^block user$/i }));

    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows 'Blocking...' and disables the confirm button when isPending is true", () => {
    render(
      <BlockConfirmDialog
        userName="Jane Doe"
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isPending={true}
      />
    );

    const button = screen.getByRole("button", { name: /blocking\.\.\./i });
    expect(button).toHaveProperty("disabled", true);
  });

  it("defaults isPending to false (button enabled, label 'Block User')", () => {
    render(
      <BlockConfirmDialog userName="Jane Doe" open={true} onOpenChange={vi.fn()} onConfirm={vi.fn()} />
    );
    const button = screen.getByRole("button", { name: /^block user$/i });
    expect(button).toHaveProperty("disabled", false);
  });
});
