import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { Switch } from "../../src/components/ui/switch";

describe("Switch", () => {
  it("renders unchecked by default (uncontrolled)", () => {
    render(<Switch />);

    const switchEl = screen.getByRole("switch");
    expect(switchEl.getAttribute("aria-checked")).toBe("false");
    expect(switchEl.getAttribute("data-state")).toBe("unchecked");
  });

  it("toggles to checked and calls onCheckedChange(true) when clicked (uncontrolled)", () => {
    const handleCheckedChange = vi.fn();
    render(<Switch onCheckedChange={handleCheckedChange} />);

    const switchEl = screen.getByRole("switch");
    fireEvent.click(switchEl);

    expect(handleCheckedChange).toHaveBeenCalledWith(true);
  });

  it("respects defaultChecked=true on initial render", () => {
    render(<Switch defaultChecked />);

    const switchEl = screen.getByRole("switch");
    expect(switchEl.getAttribute("data-state")).toBe("checked");
  });

  it("supports controlled checked state: the checked prop drives data-state regardless of clicks unless the parent updates it", () => {
    const handleCheckedChange = vi.fn();

    function ControlledSwitch() {
      const [checked, setChecked] = useState(false);
      return (
        <Switch
          checked={checked}
          onCheckedChange={(value) => {
            handleCheckedChange(value);
            setChecked(value);
          }}
        />
      );
    }

    render(<ControlledSwitch />);
    const switchEl = screen.getByRole("switch");
    expect(switchEl.getAttribute("data-state")).toBe("unchecked");

    fireEvent.click(switchEl);

    expect(handleCheckedChange).toHaveBeenCalledWith(true);
    expect(switchEl.getAttribute("data-state")).toBe("checked");
  });

  it("does not fire onCheckedChange when disabled", () => {
    const handleCheckedChange = vi.fn();
    render(<Switch disabled onCheckedChange={handleCheckedChange} />);

    const switchEl = screen.getByRole("switch");
    fireEvent.click(switchEl);

    expect(handleCheckedChange).not.toHaveBeenCalled();
    expect(switchEl).toBeDisabled();
  });

  it("applies default size classes (h-[1.15rem] w-8) when size prop is omitted", () => {
    render(<Switch />);

    const switchEl = screen.getByRole("switch");
    expect(switchEl.getAttribute("data-size")).toBe("default");
    expect(switchEl.className).toContain("data-[size=default]:h-[1.15rem]");
  });

  it("applies sm size data attribute when size='sm'", () => {
    render(<Switch size="sm" />);

    const switchEl = screen.getByRole("switch");
    expect(switchEl.getAttribute("data-size")).toBe("sm");
  });
});
