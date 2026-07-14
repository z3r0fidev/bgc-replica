import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { PresenceIndicator } from "../../src/components/chat/presence-indicator";
import { TypingIndicator } from "../../src/components/chat/typing-indicator";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

describe("PresenceIndicator", () => {
  it("applies the green online class for status='online'", () => {
    const { container } = render(<PresenceIndicator status="online" />);
    const span = container.querySelector("span")!;
    expect(span.className).toContain("bg-green-500");
    expect(span.className).not.toContain("bg-yellow-500");
    expect(span.className).not.toContain("bg-gray-400");
  });

  it("applies the yellow idle class for status='idle'", () => {
    const { container } = render(<PresenceIndicator status="idle" />);
    const span = container.querySelector("span")!;
    expect(span.className).toContain("bg-yellow-500");
  });

  it("applies the gray offline class for status='offline'", () => {
    const { container } = render(<PresenceIndicator status="offline" />);
    const span = container.querySelector("span")!;
    expect(span.className).toContain("bg-gray-400");
  });

  it("merges an additional className prop", () => {
    const { container } = render(<PresenceIndicator status="online" className="custom-class" />);
    const span = container.querySelector("span")!;
    expect(span.className).toContain("custom-class");
  });
});

describe("TypingIndicator", () => {
  it("renders the generic 'Typing...' label when no username is given", () => {
    const { getByText } = render(<TypingIndicator />);
    expect(getByText("Typing...")).toBeDefined();
  });

  it("renders '<username> is typing...' when a username is given", () => {
    const { getByText } = render(<TypingIndicator username="alice" />);
    expect(getByText("alice is typing...")).toBeDefined();
  });
});
