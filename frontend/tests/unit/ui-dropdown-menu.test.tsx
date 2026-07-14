import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuShortcut,
} from "../../src/components/ui/dropdown-menu";

// Radix's DropdownMenuTrigger opens on pointerdown (not click) so that it
// behaves consistently across mouse/touch/keyboard. jsdom's fireEvent.click
// does not synthesize a preceding pointerdown, so tests must fire it directly.
function openMenu(triggerText: string) {
  fireEvent.pointerDown(screen.getByText(triggerText), { button: 0, ctrlKey: false });
}

describe("DropdownMenu", () => {
  it("does not render menu items until the trigger is activated", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    expect(screen.queryByText("Profile")).toBeNull();
  });

  it("opens the menu and shows items when the trigger is activated", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    openMenu("Open menu");

    await waitFor(() => {
      expect(screen.getByText("Profile")).toBeDefined();
    });
    expect(screen.getByText("Account")).toBeDefined();
  });

  it("fires onSelect / onClick when a DropdownMenuItem is clicked", async () => {
    const handleSelect = vi.fn();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleSelect}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    openMenu("Open menu");
    await waitFor(() => expect(screen.getByText("Logout")).toBeDefined());

    fireEvent.click(screen.getByText("Logout"));

    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it("toggles a DropdownMenuCheckboxItem and calls onCheckedChange", async () => {
    const handleCheckedChange = vi.fn();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked={false} onCheckedChange={handleCheckedChange}>
            Show archived
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    openMenu("Open menu");
    await waitFor(() => expect(screen.getByText("Show archived")).toBeDefined());

    fireEvent.click(screen.getByText("Show archived"));

    expect(handleCheckedChange).toHaveBeenCalledWith(true);
  });

  it("selects a DropdownMenuRadioItem and calls onValueChange with its value", async () => {
    const handleValueChange = vi.fn();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="light" onValueChange={handleValueChange}>
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    openMenu("Open menu");
    await waitFor(() => expect(screen.getByText("Dark")).toBeDefined());

    fireEvent.click(screen.getByText("Dark"));

    expect(handleValueChange).toHaveBeenCalledWith("dark");
  });

  it("marks a disabled DropdownMenuItem as aria-disabled and unfocusable (Radix blocks activation via CSS pointer-events + roving tabindex, not a JS click guard)", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem disabled>Disabled item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    openMenu("Open menu");
    await waitFor(() => expect(screen.getByText("Disabled item")).toBeDefined());

    const item = screen.getByText("Disabled item");
    expect(item.getAttribute("aria-disabled")).toBe("true");
    expect(item.getAttribute("data-disabled")).toBe("");
    // Roving focus group makes disabled items unreachable via keyboard.
    expect(item.getAttribute("tabindex")).toBe("-1");
    expect(item.className).toContain("data-[disabled]:pointer-events-none");
  });

  it("supports inset styling hook on DropdownMenuItem and DropdownMenuLabel", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel inset>Section</DropdownMenuLabel>
          <DropdownMenuItem inset>Inset item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    openMenu("Open menu");
    await waitFor(() => expect(screen.getByText("Inset item")).toBeDefined());

    expect(screen.getByText("Inset item").className).toContain("pl-8");
    expect(screen.getByText("Section").className).toContain("pl-8");
  });

  it("opens a DropdownMenuSub's content when its DropdownMenuSubTrigger is clicked, revealing the nested item", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger inset>More options</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Nested item</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    openMenu("Open menu");
    await waitFor(() => expect(screen.getByText("More options")).toBeDefined());

    // inset should apply the same left-padding hook as DropdownMenuItem/Label.
    expect(screen.getByText("More options").className).toContain("pl-8");
    expect(screen.queryByText("Nested item")).toBeNull();

    fireEvent.click(screen.getByText("More options"));

    await waitFor(() => {
      expect(screen.getByText("Nested item")).toBeDefined();
    });
  });

  it("renders DropdownMenuShortcut text with its muted/right-aligned styling classes", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            Save
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    openMenu("Open menu");
    await waitFor(() => expect(screen.getByText("⌘S")).toBeDefined());

    expect(screen.getByText("⌘S").className).toContain("ml-auto");
  });
});
