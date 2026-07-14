import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar, AvatarImage, AvatarFallback } from "../../src/components/ui/avatar";

describe("Avatar", () => {
  it("renders fallback content when composed without a loaded image", () => {
    render(
      <Avatar>
        <AvatarImage src="/does-not-exist.png" alt="user" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );

    // jsdom never "loads" images, so Radix Avatar renders the fallback.
    expect(screen.getByText("JD")).toBeDefined();
  });

  it("applies base rounded/overflow classes on the root", () => {
    render(
      <Avatar data-testid="avatar-root">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );

    const root = screen.getByTestId("avatar-root");
    expect(root.className).toContain("rounded-full");
    expect(root.className).toContain("overflow-hidden");
  });

  it("merges custom className on the root alongside base classes", () => {
    render(
      <Avatar data-testid="avatar-root" className="my-avatar-class">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );

    const root = screen.getByTestId("avatar-root");
    expect(root.className).toContain("my-avatar-class");
    expect(root.className).toContain("rounded-full");
  });

  it("applies fallback-specific classes to the fallback element", () => {
    render(
      <Avatar>
        <AvatarFallback data-testid="fallback">AB</AvatarFallback>
      </Avatar>
    );

    const fallback = screen.getByTestId("fallback");
    expect(fallback.className).toContain("bg-muted");
    expect(fallback.getAttribute("data-slot")).toBe("avatar-fallback");
  });
});
