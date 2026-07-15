import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ForumLayout from "../../src/app/(forums)/forums/layout";
import { forumsService, type ForumCategoryTree } from "../../src/services/forums";

vi.mock("@/services/forums", () => ({
  forumsService: {
    getTree: vi.fn(),
  },
}));

vi.mock("@/components/forums/tree-nav", () => ({
  ForumTreeNav: (props: { categories: ForumCategoryTree[] }) => (
    <div data-testid="tree-nav">{props.categories.length}</div>
  ),
}));

function makeTree(): ForumCategoryTree[] {
  return [
    { id: "1", name: "General", slug: "general", parent_id: null, children: [] },
    { id: "2", name: "Support", slug: "support", parent_id: null, children: [] },
  ];
}

describe("ForumLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows skeletons while the category tree is loading", () => {
    vi.mocked(forumsService.getTree).mockReturnValue(new Promise(() => {}));

    render(
      <ForumLayout>
        <div>page content</div>
      </ForumLayout>
    );

    expect(screen.queryByTestId("tree-nav")).toBeNull();
  });

  it("fetches the tree on mount and renders ForumTreeNav with the result", async () => {
    vi.mocked(forumsService.getTree).mockResolvedValue(makeTree());

    render(
      <ForumLayout>
        <div>page content</div>
      </ForumLayout>
    );

    await waitFor(() => {
      expect(screen.getByTestId("tree-nav").textContent).toBe("2");
    });
  });

  it("always renders the children passed to it", async () => {
    vi.mocked(forumsService.getTree).mockResolvedValue(makeTree());

    render(
      <ForumLayout>
        <div>unique page content</div>
      </ForumLayout>
    );

    expect(screen.getByText("unique page content")).toBeDefined();
    await waitFor(() => {
      expect(screen.getByTestId("tree-nav")).toBeDefined();
    });
  });

  it("renders the sidebar branding", async () => {
    vi.mocked(forumsService.getTree).mockResolvedValue([]);

    render(
      <ForumLayout>
        <div>page content</div>
      </ForumLayout>
    );

    expect(screen.getByText("Communities")).toBeDefined();
    expect(screen.getByText("BGC Replica Forums v1.0")).toBeDefined();
  });
});
