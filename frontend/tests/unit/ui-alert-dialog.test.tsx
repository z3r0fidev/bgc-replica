import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogMedia,
  AlertDialogAction,
  AlertDialogCancel,
} from "../../src/components/ui/alert-dialog";

describe("AlertDialog", () => {
  it("does not render content until the trigger is clicked", () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Delete</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>
    );

    expect(screen.queryByText("Are you sure?")).toBeNull();
  });

  it("opens the alert dialog content when the trigger is clicked", async () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Delete</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    );

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(screen.getByText("Are you sure?")).toBeDefined();
    });
    expect(screen.getByText("This cannot be undone.")).toBeDefined();
  });

  it("calls onClick and closes the dialog when AlertDialogAction is clicked", async () => {
    const handleConfirm = vi.fn();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );

    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(handleConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
  });

  it("closes the dialog when AlertDialogCancel is clicked without invoking a confirm handler", async () => {
    const handleConfirm = vi.fn();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );

    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(handleConfirm).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
  });

  it("renders AlertDialogAction with the button's destructive variant classes when specified", async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm</AlertDialogTitle>
          <AlertDialogAction variant="destructive">Delete forever</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    );

    const action = await screen.findByRole("button", { name: "Delete forever" });
    expect(action.className).toContain("bg-destructive");
  });

  it("renders AlertDialogContent with size=sm data attribute and matching max-width class hook", async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent size="sm">
          <AlertDialogTitle>Small</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>
    );

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.getAttribute("data-size")).toBe("sm");
  });

  it("defaults AlertDialogContent size to 'default' when not specified", async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Regular</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>
    );

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.getAttribute("data-size")).toBe("default");
  });

  it("renders an AlertDialogMedia icon wrapper with its base classes when composed in the header", async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia data-testid="media">
              <svg />
            </AlertDialogMedia>
            <AlertDialogTitle>With icon</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    );

    const media = await screen.findByTestId("media");
    expect(media.className).toContain("bg-muted");
    expect(media.className).toContain("rounded-md");
  });
});
