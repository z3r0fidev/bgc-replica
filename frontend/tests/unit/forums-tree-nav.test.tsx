import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ForumTreeNav } from "../../src/components/forums/tree-nav";
import type { ForumCategoryTree } from "../../src/services/forums";

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

function makeTree(): ForumCategoryTree[] {
  return [
    {
      id: "1",
      name: "General",
      slug: "general",
      parent_id: null,
      children: [
        {
          id: "2",
          name: "Announcements",
          slug: "announcements",
          parent_id: "1",
          children: [],
        },
      ],
    },
    {
      id: "3",
      name: "Off Topic",
      slug: "off-topic",
      parent_id: null,
      children: [],
    },
  ];
}

describe("ForumTreeNav", () => {
  it("renders nested categories recursively", () => {
    mockUsePathname.mockReturnValue("/forums");
    render(<ForumTreeNav categories={makeTree()} />);

    expect(screen.getByText("General")).toBeDefined();
    expect(screen.getByText("Announcements")).toBeDefined();
    expect(screen.getByText("Off Topic")).toBeDefined();
  });

  it("highlights the category whose slug is part of the current pathname", () => {
    mockUsePathname.mockReturnValue("/forums/off-topic");
    render(<ForumTreeNav categories={makeTree()} />);

    const offTopicRow = screen.getByText("Off Topic").closest("div.flex.items-center")!;
    expect(offTopicRow.className).toContain("bg-white/20");

    const generalRow = screen.getByText("General").closest("div.flex.items-center")!;
    expect(generalRow.className).not.toContain("bg-white/20");
  });

  it("collapses and expands children when the toggle button is clicked", () => {
    mockUsePathname.mockReturnValue("/forums");
    render(<ForumTreeNav categories={makeTree()} />);

    // Starts open by default.
    expect(screen.getByText("Announcements")).toBeDefined();

    const toggleButtons = screen.getAllByRole("button");
    // The "General" node's toggle is the first non-invisible one; find it via
    // proximity to the "General" text.
    const generalRow = screen.getByText("General").closest("div.flex.items-center")!;
    const generalToggle = generalRow.querySelector("button")!;
    fireEvent.click(generalToggle);

    expect(screen.queryByText("Announcements")).toBeNull();

    fireEvent.click(generalToggle);
    expect(screen.getByText("Announcements")).toBeDefined();

    // Sanity: the leaf node's toggle button exists but is visually disabled
    // (no children to expand).
    const offTopicRow = screen.getByText("Off Topic").closest("div.flex.items-center")!;
    const offTopicToggle = offTopicRow.querySelector("button")!;
    expect(offTopicToggle.className).toContain("invisible");
    expect(toggleButtons.length).toBeGreaterThan(0);
  });

  it("renders nothing when categories is empty", () => {
    mockUsePathname.mockReturnValue("/forums");
    const { container } = render(<ForumTreeNav categories={[]} />);
    expect(container.querySelector("nav")?.children.length).toBe(0);
  });
});
