import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ForumBreadcrumbs } from "../../src/components/forums/breadcrumbs";
import { ForumHeader } from "../../src/components/forums/forum-header";
import { forumsService, type ForumCategoryTree } from "../../src/services/forums";

const mockUseParams = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
}));

vi.mock("@/services/forums", () => ({
  forumsService: { getTree: vi.fn() },
}));

vi.mock("next/image", () => ({
  default: (
    props: { src: string; alt: string; fill?: boolean } & Record<string, unknown>
  ) => {
    const { src, alt, fill, ...rest } = props;
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...rest} />;
  },
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
          description: "Official news",
          banner_path: "/banner.png",
          children: [],
        },
      ],
    },
  ];
}

describe("ForumBreadcrumbs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves and renders the breadcrumb path for a nested category", async () => {
    mockUseParams.mockReturnValue({ slug: ["general", "announcements"] });
    vi.mocked(forumsService.getTree).mockResolvedValue(makeTree());

    render(<ForumBreadcrumbs />);

    expect(screen.getByText("HOME")).toBeDefined();
    await waitFor(() => expect(screen.getByText("General")).toBeDefined());
    expect(screen.getByText("Announcements")).toBeDefined();
  });

  it("stops resolving the path at the first slug that isn't found", async () => {
    mockUseParams.mockReturnValue({ slug: ["general", "does-not-exist"] });
    vi.mocked(forumsService.getTree).mockResolvedValue(makeTree());

    render(<ForumBreadcrumbs />);

    await waitFor(() => expect(screen.getByText("General")).toBeDefined());
    expect(screen.queryByText("does-not-exist")).toBeNull();
  });

  it("renders only the HOME link when there is no slug", () => {
    mockUseParams.mockReturnValue({});
    render(<ForumBreadcrumbs />);

    expect(screen.getByText("HOME")).toBeDefined();
    expect(forumsService.getTree).not.toHaveBeenCalled();
  });
});

describe("ForumHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the active category's name and description once resolved", async () => {
    mockUseParams.mockReturnValue({ slug: ["general", "announcements"] });
    vi.mocked(forumsService.getTree).mockResolvedValue(makeTree());

    render(<ForumHeader />);

    await waitFor(() => expect(screen.getByText("Announcements")).toBeDefined());
    expect(screen.getByText("Official news")).toBeDefined();
  });

  it("renders a banner Image when banner_path is set", async () => {
    mockUseParams.mockReturnValue({ slug: ["general", "announcements"] });
    vi.mocked(forumsService.getTree).mockResolvedValue(makeTree());

    render(<ForumHeader />);

    await waitFor(() => expect(screen.getByAltText("Announcements")).toBeDefined());
  });

  it("finds a category nested deeper in the tree via recursive search", async () => {
    // currentSlug resolves from the *last* slug segment, and the tree walk
    // recurses through children to find it regardless of nesting depth.
    mockUseParams.mockReturnValue({ slug: ["announcements"] });
    vi.mocked(forumsService.getTree).mockResolvedValue(makeTree());

    render(<ForumHeader />);

    await waitFor(() => expect(screen.getByText("Announcements")).toBeDefined());
  });

  it("renders nothing when there is no active category", () => {
    mockUseParams.mockReturnValue({ slug: undefined });
    const { container } = render(<ForumHeader />);
    expect(container.firstChild).toBeNull();
    expect(forumsService.getTree).not.toHaveBeenCalled();
  });

  it("renders nothing while the category can't be found in the tree", async () => {
    mockUseParams.mockReturnValue({ slug: ["ghost-category"] });
    vi.mocked(forumsService.getTree).mockResolvedValue(makeTree());

    const { container } = render(<ForumHeader />);

    await waitFor(() => expect(forumsService.getTree).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });
});
