import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, badgeVariants } from "../../src/components/ui/badge";

describe("Badge", () => {
  it("renders as a span by default with default variant classes", () => {
    render(<Badge>New</Badge>);

    const badge = screen.getByText("New");
    expect(badge.tagName).toBe("SPAN");
    expect(badge.className).toContain("bg-primary");
    expect(badge.getAttribute("data-slot")).toBe("badge");
  });

  it("applies secondary variant classes distinct from default", () => {
    render(<Badge variant="secondary">Secondary</Badge>);

    const badge = screen.getByText("Secondary");
    expect(badge.className).toContain("bg-secondary");
    expect(badge.className).not.toContain("bg-primary");
  });

  it("applies destructive variant classes", () => {
    render(<Badge variant="destructive">Danger</Badge>);

    const badge = screen.getByText("Danger");
    expect(badge.className).toContain("bg-destructive");
  });

  it("applies outline variant classes without a solid background", () => {
    render(<Badge variant="outline">Outline</Badge>);

    const badge = screen.getByText("Outline");
    expect(badge.className).toContain("text-foreground");
    expect(badge.className).not.toContain("bg-primary");
    expect(badge.className).not.toContain("bg-secondary");
  });

  it("renders as an anchor element instead of a span when asChild is used", () => {
    render(
      <Badge asChild>
        <a href="/tag">Tag</a>
      </Badge>
    );

    expect(screen.queryByText("Tag")?.tagName).toBe("A");
    const link = screen.getByRole("link", { name: "Tag" });
    expect(link.getAttribute("href")).toBe("/tag");
    expect(link.className).toContain("bg-primary");
  });

  it("merges custom className alongside variant classes", () => {
    render(<Badge className="my-badge-class">Custom</Badge>);

    const badge = screen.getByText("Custom");
    expect(badge.className).toContain("my-badge-class");
    expect(badge.className).toContain("bg-primary");
  });

  it("badgeVariants() produces different output for different variants", () => {
    const outlineClasses = badgeVariants({ variant: "outline" });
    const destructiveClasses = badgeVariants({ variant: "destructive" });

    expect(outlineClasses).not.toBe(destructiveClasses);
  });
});
