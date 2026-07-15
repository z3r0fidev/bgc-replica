import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "../../src/components/ui/dialog";

describe("Dialog", () => {
  it("does not render content until opened via the trigger (uncontrolled)", () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>My Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(screen.queryByText("My Dialog")).toBeNull();
  });

  it("opens the content when the trigger is clicked", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>My Dialog</DialogTitle>
            <DialogDescription>Some description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    fireEvent.click(screen.getByText("Open"));

    await waitFor(() => {
      expect(screen.getByText("My Dialog")).toBeDefined();
    });
    expect(screen.getByText("Some description")).toBeDefined();
  });

  it("closes the dialog when the built-in close (X) button is clicked", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Closable</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    fireEvent.click(screen.getByText("Open"));
    await waitFor(() => expect(screen.getByText("Closable")).toBeDefined());

    fireEvent.click(screen.getByText("Close"));

    await waitFor(() => {
      expect(screen.queryByText("Closable")).toBeNull();
    });
  });

  it("closes the dialog via an explicit DialogClose element", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Footer Close</DialogTitle>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    fireEvent.click(screen.getByText("Open"));
    await waitFor(() => expect(screen.getByText("Footer Close")).toBeDefined());

    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(screen.queryByText("Footer Close")).toBeNull();
    });
  });

  it("supports controlled open state via the open/onOpenChange props", async () => {
    const onOpenChange = vi.fn();

    function ControlledDialog() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button
            onClick={() => {
              setOpen(true);
              onOpenChange(true);
            }}
          >
            External open
          </button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogTitle>Controlled</DialogTitle>
            </DialogContent>
          </Dialog>
        </>
      );
    }

    render(<ControlledDialog />);

    expect(screen.queryByText("Controlled")).toBeNull();

    fireEvent.click(screen.getByText("External open"));

    await waitFor(() => {
      expect(screen.getByText("Controlled")).toBeDefined();
    });
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("calls onOpenChange(false) when closed via the X button in controlled mode", async () => {
    const handleOpenChange = vi.fn();

    function ControlledDialog() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            handleOpenChange(next);
          }}
        >
          <DialogContent>
            <DialogTitle>Controlled Close</DialogTitle>
          </DialogContent>
        </Dialog>
      );
    }

    render(<ControlledDialog />);
    await waitFor(() => expect(screen.getByText("Controlled Close")).toBeDefined());

    fireEvent.click(screen.getByText("Close"));

    await waitFor(() => {
      expect(handleOpenChange).toHaveBeenCalledWith(false);
      expect(screen.queryByText("Controlled Close")).toBeNull();
    });
  });

  it("merges custom className on DialogContent alongside base classes", async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent className="my-dialog-class">
          <DialogTitle>Styled</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => expect(screen.getByText("Styled")).toBeDefined());
    const content = screen.getByText("Styled").closest('[role="dialog"]');
    expect(content?.className).toContain("my-dialog-class");
  });
});
