import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../src/components/ui/tabs";

describe("Tabs", () => {
  it("shows the content for the defaultValue tab and hides the other tab's content", () => {
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">Content one</TabsContent>
        <TabsContent value="two">Content two</TabsContent>
      </Tabs>
    );

    expect(screen.getByText("Content one")).toBeDefined();
    expect(screen.queryByText("Content two")).toBeNull();
  });

  it("switches visible content and calls onValueChange when a different tab trigger is activated", () => {
    const handleValueChange = vi.fn();

    render(
      <Tabs defaultValue="one" onValueChange={handleValueChange}>
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">Content one</TabsContent>
        <TabsContent value="two">Content two</TabsContent>
      </Tabs>
    );

    // Radix's TabsTrigger switches tabs on mousedown (not click), so that
    // selection tracks the same interaction browsers use for tab-order.
    fireEvent.mouseDown(screen.getByText("Two"), { button: 0, ctrlKey: false });

    expect(handleValueChange).toHaveBeenCalledWith("two");
    expect(screen.getByText("Content two")).toBeDefined();
    expect(screen.queryByText("Content one")).toBeNull();
  });

  it("marks the active trigger with data-state=active and inactive triggers as inactive", () => {
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">Content one</TabsContent>
        <TabsContent value="two">Content two</TabsContent>
      </Tabs>
    );

    expect(screen.getByText("One").getAttribute("data-state")).toBe("active");
    expect(screen.getByText("Two").getAttribute("data-state")).toBe("inactive");
  });

  it("supports controlled value: the value prop determines the visible tab content", () => {
    function ControlledTabs() {
      const [value, setValue] = useState("one");
      return (
        <>
          <button onClick={() => setValue("two")}>Go to two</button>
          <Tabs value={value} onValueChange={setValue}>
            <TabsList>
              <TabsTrigger value="one">One</TabsTrigger>
              <TabsTrigger value="two">Two</TabsTrigger>
            </TabsList>
            <TabsContent value="one">Content one</TabsContent>
            <TabsContent value="two">Content two</TabsContent>
          </Tabs>
        </>
      );
    }

    render(<ControlledTabs />);

    expect(screen.getByText("Content one")).toBeDefined();

    fireEvent.click(screen.getByText("Go to two"));

    expect(screen.getByText("Content two")).toBeDefined();
    expect(screen.queryByText("Content one")).toBeNull();
  });

  it("does not switch to a disabled tab trigger", () => {
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two" disabled>
            Two
          </TabsTrigger>
        </TabsList>
        <TabsContent value="one">Content one</TabsContent>
        <TabsContent value="two">Content two</TabsContent>
      </Tabs>
    );

    fireEvent.mouseDown(screen.getByText("Two"), { button: 0, ctrlKey: false });

    expect(screen.getByText("Content one")).toBeDefined();
    expect(screen.queryByText("Content two")).toBeNull();
  });
});
