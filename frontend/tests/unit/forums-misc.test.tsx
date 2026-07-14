import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateThreadFAB } from "../../src/components/forums/create-thread-fab";
import { ForumStats } from "../../src/components/forums/stats";
import { useForumStats } from "../../src/hooks/use-forum-stats";

vi.mock("@/hooks/use-forum-stats", () => ({
  useForumStats: vi.fn(),
}));

describe("CreateThreadFAB", () => {
  it("renders a 'Create Thread' button", () => {
    render(<CreateThreadFAB />);
    expect(screen.getByText("Create Thread")).toBeDefined();
  });

  it("alerts the placeholder message when clicked", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<CreateThreadFAB />);

    fireEvent.click(screen.getByRole("button"));

    expect(alertSpy).toHaveBeenCalledWith("Create Thread Modal/Page coming soon!");
    alertSpy.mockRestore();
  });
});

describe("ForumStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the active user count from useForumStats", () => {
    vi.mocked(useForumStats).mockReturnValue({ activeUsers: 7 });
    render(<ForumStats forumId="forum-1" />);
    expect(screen.getByText("7 ACTIVE")).toBeDefined();
  });

  it("renders 0 ACTIVE when there are no active users", () => {
    vi.mocked(useForumStats).mockReturnValue({ activeUsers: 0 });
    render(<ForumStats forumId="forum-1" />);
    expect(screen.getByText("0 ACTIVE")).toBeDefined();
  });

  it("passes the forumId through to useForumStats", () => {
    vi.mocked(useForumStats).mockReturnValue({ activeUsers: 1 });
    render(<ForumStats forumId="forum-42" />);
    expect(useForumStats).toHaveBeenCalledWith("forum-42");
  });
});
