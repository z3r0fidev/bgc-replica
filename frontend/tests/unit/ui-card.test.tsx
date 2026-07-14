import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "../../src/components/ui/card";

describe("Card", () => {
  it("renders a full card composition with all sub-parts", () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );

    expect(screen.getByTestId("card")).toBeDefined();
    expect(screen.getByText("Title")).toBeDefined();
    expect(screen.getByText("Description")).toBeDefined();
    expect(screen.getByText("Action")).toBeDefined();
    expect(screen.getByText("Content")).toBeDefined();
    expect(screen.getByText("Footer")).toBeDefined();
  });

  it("applies default variant classes on Card by default", () => {
    render(<Card data-testid="card">body</Card>);

    const card = screen.getByTestId("card");
    expect(card.className).toContain("bg-card");
    expect(card.className).not.toContain("glass");
    expect(card.className).not.toContain("neo-brutal");
  });

  it("applies glass variant classes when variant='glass'", () => {
    render(
      <Card data-testid="card" variant="glass">
        body
      </Card>
    );

    const card = screen.getByTestId("card");
    expect(card.className).toContain("glass");
  });

  it("applies neo variant classes when variant='neo'", () => {
    render(
      <Card data-testid="card" variant="neo">
        body
      </Card>
    );

    const card = screen.getByTestId("card");
    expect(card.className).toContain("neo-brutal");
    expect(card.className).toContain("rounded-none");
  });

  it("merges custom className on each sub-component alongside base classes", () => {
    render(
      <CardContent data-testid="content" className="my-content-class">
        text
      </CardContent>
    );

    const content = screen.getByTestId("content");
    expect(content.className).toContain("my-content-class");
    expect(content.className).toContain("px-6");
  });

  it("assigns data-slot attributes for each part for slot-based styling hooks", () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="header">h</CardHeader>
        <CardFooter data-testid="footer">f</CardFooter>
      </Card>
    );

    expect(screen.getByTestId("card").getAttribute("data-slot")).toBe("card");
    expect(screen.getByTestId("header").getAttribute("data-slot")).toBe("card-header");
    expect(screen.getByTestId("footer").getAttribute("data-slot")).toBe("card-footer");
  });
});
