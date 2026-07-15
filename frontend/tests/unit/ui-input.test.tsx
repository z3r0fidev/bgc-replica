import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { Input } from "../../src/components/ui/input";

describe("Input", () => {
  it("defaults to type=text when no type prop is provided", () => {
    render(<Input placeholder="name" />);

    const input = screen.getByPlaceholderText("name") as HTMLInputElement;
    // React/DOM defaults an <input> with no type attribute to "text"
    expect(input.type).toBe("text");
  });

  it("forwards the type prop to the underlying input element", () => {
    render(<Input type="email" placeholder="email" />);

    const input = screen.getByPlaceholderText("email") as HTMLInputElement;
    expect(input.type).toBe("email");
  });

  it("forwards the disabled prop to the underlying input element", () => {
    render(<Input disabled placeholder="disabled-input" />);

    const input = screen.getByPlaceholderText("disabled-input");
    expect(input).toBeDisabled();
  });

  it("fires onChange and updates the DOM value when typed into (uncontrolled)", () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} placeholder="uncontrolled" />);

    const input = screen.getByPlaceholderText("uncontrolled") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hello" } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(input.value).toBe("hello");
  });

  it("merges a custom className with the base input classes", () => {
    render(<Input className="my-input-class" placeholder="styled" />);

    const input = screen.getByPlaceholderText("styled");
    expect(input.className).toContain("my-input-class");
    expect(input.className).toContain("rounded-md");
  });

  it("forwards a ref to the underlying input DOM node", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} placeholder="ref-input" />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("INPUT");
  });
});
