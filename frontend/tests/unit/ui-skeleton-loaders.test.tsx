import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ProfileCardSkeleton,
  MessageSkeleton,
  PostSkeleton,
  ForumThreadSkeleton,
  GroupChatSkeleton,
  TableRowSkeleton,
  ListSkeleton,
} from "../../src/components/ui/skeleton-loaders";

describe("skeleton-loaders", () => {
  it("ProfileCardSkeleton renders a card wrapper with pulse placeholders", () => {
    const { container } = render(<ProfileCardSkeleton />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(container.querySelector(".rounded-full")).not.toBeNull();
  });

  it("MessageSkeleton renders an avatar-shaped and text-shaped placeholder", () => {
    const { container } = render(<MessageSkeleton />);

    expect(container.querySelector(".rounded-full")).not.toBeNull();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("PostSkeleton renders a media placeholder block plus action row placeholders", () => {
    const { container } = render(<PostSkeleton />);

    // three action-button-sized skeletons at the bottom
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(8);
  });

  it("ForumThreadSkeleton renders title and meta placeholders", () => {
    const { container } = render(<ForumThreadSkeleton />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("GroupChatSkeleton renders an avatar, text lines, and a badge placeholder", () => {
    const { container } = render(<GroupChatSkeleton />);

    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBe(4);
  });

  it("TableRowSkeleton renders the default 4 columns as <td> cells", () => {
    render(
      <table>
        <tbody>
          <TableRowSkeleton />
        </tbody>
      </table>
    );

    const cells = screen.getAllByRole("cell");
    expect(cells.length).toBe(4);
  });

  it("TableRowSkeleton renders a custom number of columns", () => {
    render(
      <table>
        <tbody>
          <TableRowSkeleton columns={7} />
        </tbody>
      </table>
    );

    const cells = screen.getAllByRole("cell");
    expect(cells.length).toBe(7);
  });

  it("ListSkeleton renders the default count (5) of the default ItemSkeleton (ProfileCardSkeleton)", () => {
    const { container } = render(<ListSkeleton />);

    // ProfileCardSkeleton has a distinguishing avatar rounded-full + card border wrapper
    const cardWrappers = container.querySelectorAll(".rounded-lg.border");
    expect(cardWrappers.length).toBe(5);
  });

  it("ListSkeleton renders a custom count", () => {
    const { container } = render(<ListSkeleton count={3} />);

    const cardWrappers = container.querySelectorAll(".rounded-lg.border");
    expect(cardWrappers.length).toBe(3);
  });

  it("ListSkeleton renders a custom ItemSkeleton component instead of the default", () => {
    const { container } = render(<ListSkeleton count={2} ItemSkeleton={MessageSkeleton} />);

    // MessageSkeleton wrapper class distinct from ProfileCardSkeleton's card wrapper
    const messageWrappers = container.querySelectorAll(".items-start.space-x-3");
    expect(messageWrappers.length).toBe(2);
  });
});
