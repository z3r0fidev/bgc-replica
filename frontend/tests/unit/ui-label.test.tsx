import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Label } from "../../src/components/ui/label";
import { Input } from "../../src/components/ui/input";

describe("Label", () => {
  it("renders its children text", () => {
    render(<Label>Username</Label>);

    expect(screen.getByText("Username")).toBeDefined();
  });

  it("associates with a form control via htmlFor, so getByLabelText works", () => {
    render(
      <>
        <Label htmlFor="username-input">Username</Label>
        <Input id="username-input" />
      </>
    );

    const input = screen.getByLabelText("Username");
    expect(input.id).toBe("username-input");
  });

  it("merges a custom className with the base label classes", () => {
    render(<Label className="my-label-class">Custom</Label>);

    const label = screen.getByText("Custom");
    expect(label.className).toContain("my-label-class");
    expect(label.className).toContain("text-sm");
  });

  it("sets data-slot=label on the rendered element", () => {
    render(<Label>Slot check</Label>);

    const label = screen.getByText("Slot check");
    expect(label.getAttribute("data-slot")).toBe("label");
  });
});
