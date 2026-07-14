import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "../../src/components/ui/select";

describe("Select", () => {
  // jsdom doesn't implement scrollIntoView, but Radix Select calls it when
  // positioning the open content relative to the selected item.
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });


  it("shows the placeholder text when no value is selected", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(screen.getByText("Pick a fruit")).toBeDefined();
  });

  it("shows the selected item's label as the trigger value when a defaultValue is set", () => {
    render(
      <Select defaultValue="banana">
        <SelectTrigger>
          <SelectValue placeholder="Pick a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(screen.getByText("Banana")).toBeDefined();
  });

  it("opens the item list when the trigger is clicked", async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    );

    fireEvent.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
    });
  });

  it("calls onValueChange with the selected item's value when an item is clicked", async () => {
    const handleChange = vi.fn();

    render(
      <Select onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="Pick a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    );

    fireEvent.click(screen.getByRole("combobox"));
    await waitFor(() => expect(screen.getByText("Banana")).toBeDefined());

    fireEvent.click(screen.getByText("Banana"));

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith("banana");
    });
  });

  it("supports controlled value via the value prop, reflecting the label in the trigger", () => {
    render(
      <Select value="apple" onValueChange={vi.fn()}>
        <SelectTrigger>
          <SelectValue placeholder="Pick a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(screen.getByText("Apple")).toBeDefined();
  });

  it("applies data-size=sm on the trigger when size='sm'", () => {
    render(
      <Select>
        <SelectTrigger size="sm" data-testid="trigger">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );

    const trigger = screen.getByTestId("trigger");
    expect(trigger.getAttribute("data-size")).toBe("sm");
  });

  it("defaults trigger data-size to 'default' when size prop is omitted", () => {
    render(
      <Select>
        <SelectTrigger data-testid="trigger">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );

    const trigger = screen.getByTestId("trigger");
    expect(trigger.getAttribute("data-size")).toBe("default");
  });

  it("renders SelectGroup/SelectLabel/SelectSeparator when composed inside SelectContent", async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
          </SelectGroup>
          <SelectSeparator data-testid="separator" />
        </SelectContent>
      </Select>
    );

    fireEvent.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByText("Fruits")).toBeDefined();
    });
  });

  it("disables the trigger when disabled prop is set on Select", () => {
    render(
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Pick a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("applies popper-specific positioning classes to content and viewport when position='popper'", async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick a fruit" />
        </SelectTrigger>
        <SelectContent position="popper" data-testid="content">
          <SelectItem value="apple">Apple</SelectItem>
        </SelectContent>
      </Select>
    );

    fireEvent.click(screen.getByRole("combobox"));

    const content = await screen.findByTestId("content");
    expect(content.className).toContain("data-[side=bottom]:translate-y-1");
  });
});
