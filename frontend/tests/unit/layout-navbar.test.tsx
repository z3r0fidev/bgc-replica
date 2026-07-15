import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Navbar } from "../../src/components/layout/Navbar";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({ push: pushMock })),
}));

import { usePathname } from "next/navigation";

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.cookie = "";
    vi.mocked(usePathname).mockReturnValue("/feed");
  });

  it("returns null on the /login route", () => {
    vi.mocked(usePathname).mockReturnValue("/login");
    const { container } = render(<Navbar />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null on the /register route", () => {
    vi.mocked(usePathname).mockReturnValue("/register");
    const { container } = render(<Navbar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the logged-out state (Login/Register) when no access_token is present", () => {
    render(<Navbar />);
    expect(screen.getByRole("link", { name: /login/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /register/i })).toBeDefined();
    expect(screen.queryByText("Feed")).toBeNull();
  });

  it("renders the logged-in nav items and account controls when access_token is present", () => {
    localStorage.setItem("access_token", "token-abc");
    render(<Navbar />);

    expect(screen.getByText("Home")).toBeDefined();
    expect(screen.getByText("Feed")).toBeDefined();
    expect(screen.getByText("Forums")).toBeDefined();
    expect(screen.getByRole("button", { name: /logout/i })).toBeDefined();
    expect(screen.queryByRole("link", { name: /^login$/i })).toBeNull();
  });

  it("applies active styling to the nav item matching the current pathname", () => {
    localStorage.setItem("access_token", "token-abc");
    vi.mocked(usePathname).mockReturnValue("/feed");
    render(<Navbar />);

    const feedLink = screen.getByText("Feed").closest("a")!;
    const homeLink = screen.getByText("Home").closest("a")!;
    expect(feedLink.className).toContain("text-foreground");
    expect(feedLink.className).not.toContain("text-foreground/60");
    expect(homeLink.className).toContain("text-foreground/60");
  });

  it("Logout clears the token/cookie, updates state, and navigates to /login", () => {
    localStorage.setItem("access_token", "token-abc");
    document.cookie = "access_token=token-abc; path=/";
    render(<Navbar />);

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(localStorage.getItem("access_token")).toBeNull();
    expect(document.cookie).not.toContain("access_token=token-abc");
    expect(pushMock).toHaveBeenCalledWith("/login");
    // After logout, the logged-in-only nav items should disappear.
    expect(screen.queryByText("Feed")).toBeNull();
    expect(screen.getByRole("link", { name: /login/i })).toBeDefined();
  });

  it("re-checks login state when pathname changes (e.g. token added between navigations)", () => {
    const { rerender } = render(<Navbar />);
    expect(screen.queryByText("Feed")).toBeNull();

    localStorage.setItem("access_token", "token-xyz");
    vi.mocked(usePathname).mockReturnValue("/forums");
    rerender(<Navbar />);

    expect(screen.getByText("Feed")).toBeDefined();
  });

  it("renders the Profile and Settings buttons when logged in", () => {
    localStorage.setItem("access_token", "token-abc");
    render(<Navbar />);
    expect(screen.getByRole("link", { name: /profile/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /settings/i })).toBeDefined();
  });
});
