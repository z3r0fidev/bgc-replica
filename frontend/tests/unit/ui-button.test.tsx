import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, buttonVariants } from "../../src/components/ui/button";

describe("Button", () => {
  it("renders a native button element by default", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: "Click me" });
    expect(button.tagName).toBe("BUTTON");
  });

  it("defaults to variant=default and size=default data attributes", () => {
    render(<Button>Default</Button>);

    const button = screen.getByRole("button", { name: "Default" });
    expect(button.getAttribute("data-variant")).toBe("default");
    expect(button.getAttribute("data-size")).toBe("default");
  });

  it("applies destructive variant classes and data-variant attribute", () => {
    render(<Button variant="destructive">Delete</Button>);

    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.getAttribute("data-variant")).toBe("destructive");
    expect(button.className).toContain("bg-destructive");
  });

  it("applies outline variant classes distinct from default", () => {
    render(<Button variant="outline">Outline</Button>);

    const button = screen.getByRole("button", { name: "Outline" });
    expect(button.getAttribute("data-variant")).toBe("outline");
    expect(button.className).toContain("border");
    expect(button.className).not.toContain("bg-primary");
  });

  it("applies size=lg data attribute and height class distinct from default", () => {
    render(<Button size="lg">Large</Button>);

    const button = screen.getByRole("button", { name: "Large" });
    expect(button.getAttribute("data-size")).toBe("lg");
    expect(button.className).toContain("h-10");
  });

  it("applies size=icon classes for icon-only buttons", () => {
    render(<Button size="icon" aria-label="icon-button" />);

    const button = screen.getByRole("button", { name: "icon-button" });
    expect(button.getAttribute("data-size")).toBe("icon");
    expect(button.className).toContain("size-9");
  });

  it("merges a custom className with variant classes via cn()", () => {
    render(<Button className="my-custom-class">Custom</Button>);

    const button = screen.getByRole("button", { name: "Custom" });
    expect(button.className).toContain("my-custom-class");
    expect(button.className).toContain("bg-primary");
  });

  it("renders as an anchor element instead of a button when asChild is used", () => {
    render(
      <Button asChild>
        <a href="/somewhere">Link button</a>
      </Button>
    );

    // asChild uses Radix Slot: the rendered element should be the <a>, not a <button>
    expect(screen.queryByRole("button")).toBeNull();
    const link = screen.getByRole("link", { name: "Link button" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/somewhere");
    // Button's variant classes should still be applied to the slotted element
    expect(link.className).toContain("bg-primary");
    expect(link.getAttribute("data-slot")).toBe("button");
  });

  it("disables the button and applies disabled styling hook when disabled prop is set", () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
  });

  it("buttonVariants() produces different class strings for different variant/size combos", () => {
    const defaultClasses = buttonVariants({ variant: "default", size: "default" });
    const ghostSmClasses = buttonVariants({ variant: "ghost", size: "sm" });

    expect(defaultClasses).not.toBe(ghostSmClasses);
    expect(ghostSmClasses).toContain("hover:bg-accent");
    expect(ghostSmClasses).toContain("h-8");
  });
});
