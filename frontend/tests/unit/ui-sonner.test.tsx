import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { toast } from "sonner";

const useThemeMock = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: () => useThemeMock(),
}));

import { Toaster } from "../../src/components/ui/sonner";

// Sonner's <Toaster> only renders its `[data-sonner-toaster]` list element
// once there is at least one toast queued (it returns null for the list
// otherwise), so each test below fires a real toast to populate it.
describe("Toaster (sonner wrapper)", () => {
  beforeEach(() => {
    useThemeMock.mockReset();
    window.matchMedia =
      window.matchMedia ||
      (((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as unknown as typeof window.matchMedia);
  });

  it("wires the resolved next-themes theme into the underlying Sonner toaster's data-sonner-theme attribute", async () => {
    useThemeMock.mockReturnValue({ theme: "dark" });

    const { container } = render(<Toaster />);
    toast("Hello there");

    await waitFor(() => {
      expect(container.querySelector("[data-sonner-toaster]")).not.toBeNull();
    });

    const toaster = container.querySelector("[data-sonner-toaster]");
    expect(toaster?.getAttribute("data-sonner-theme")).toBe("dark");
  });

  it("falls back to a resolved light/dark theme when next-themes reports no theme (theme defaults to 'system')", async () => {
    useThemeMock.mockReturnValue({});

    const { container } = render(<Toaster />);
    toast("Hello there");

    await waitFor(() => {
      expect(container.querySelector("[data-sonner-toaster]")).not.toBeNull();
    });

    const toaster = container.querySelector("[data-sonner-toaster]");
    // 'system' resolves to either light or dark based on matchMedia, both are valid resolutions
    expect(["light", "dark"]).toContain(toaster?.getAttribute("data-sonner-theme"));
  });

  it("applies the 'toaster group' className to the underlying container", async () => {
    useThemeMock.mockReturnValue({ theme: "light" });

    const { container } = render(<Toaster />);
    toast("Hello there");

    await waitFor(() => {
      expect(container.querySelector("[data-sonner-toaster]")).not.toBeNull();
    });

    const toaster = container.querySelector("[data-sonner-toaster]");
    expect(toaster?.className).toContain("toaster");
    expect(toaster?.className).toContain("group");
  });

  it("forwards additional ToasterProps such as position through to Sonner", async () => {
    useThemeMock.mockReturnValue({ theme: "light" });

    const { container } = render(<Toaster position="top-center" />);
    toast("Hello there");

    await waitFor(() => {
      expect(container.querySelector("[data-sonner-toaster]")).not.toBeNull();
    });

    const toaster = container.querySelector("[data-sonner-toaster]");
    expect(toaster?.getAttribute("data-x-position")).toBe("center");
    expect(toaster?.getAttribute("data-y-position")).toBe("top");
  });
});
