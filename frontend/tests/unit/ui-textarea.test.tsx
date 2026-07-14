import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Textarea } from "../../src/components/ui/textarea";

describe("Textarea", () => {
  it("renders a native textarea element", () => {
    render(<Textarea placeholder="bio" />);

    const textarea = screen.getByPlaceholderText("bio");
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("forwards the disabled prop to the underlying textarea", () => {
    render(<Textarea disabled placeholder="disabled-textarea" />);

    expect(screen.getByPlaceholderText("disabled-textarea")).toBeDisabled();
  });

  it("fires onChange and updates the DOM value when typed into (uncontrolled)", () => {
    const handleChange = vi.fn();
    render(<Textarea onChange={handleChange} placeholder="uncontrolled" />);

    const textarea = screen.getByPlaceholderText("uncontrolled") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "hello world" } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(textarea.value).toBe("hello world");
  });

  it("merges a custom className with the base textarea classes", () => {
    render(<Textarea className="my-textarea-class" placeholder="styled" />);

    const textarea = screen.getByPlaceholderText("styled");
    expect(textarea.className).toContain("my-textarea-class");
    expect(textarea.className).toContain("rounded-md");
  });

  it("sets data-slot=textarea on the rendered element", () => {
    render(<Textarea placeholder="slot-check" />);

    expect(screen.getByPlaceholderText("slot-check").getAttribute("data-slot")).toBe(
      "textarea"
    );
  });
});
