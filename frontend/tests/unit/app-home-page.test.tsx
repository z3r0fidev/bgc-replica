import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "../../src/app/page";

describe("LandingPage (home)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows Get Started / Sign In links pointing to register/login when logged out", () => {
    render(<LandingPage />);

    const getStarted = screen.getByRole("link", { name: /get started/i });
    const signIn = screen.getByRole("link", { name: /sign in/i });
    expect(getStarted.getAttribute("href")).toBe("/register");
    expect(signIn.getAttribute("href")).toBe("/login");
    expect(screen.queryByText("Go to Community Feed")).toBeNull();
  });

  it("shows a 'Go to Community Feed' link instead when an access_token is present", () => {
    localStorage.setItem("access_token", "tok-abc");
    render(<LandingPage />);

    const feedLink = screen.getByRole("link", { name: /go to community feed/i });
    expect(feedLink.getAttribute("href")).toBe("/feed");
    expect(screen.queryByRole("link", { name: /get started/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
  });

  it("renders the three feature cards", () => {
    render(<LandingPage />);

    expect(screen.getByText("Profiles")).toBeDefined();
    expect(screen.getByText("Real-time Chat")).toBeDefined();
    expect(screen.getByText("Community")).toBeDefined();
  });

  it("renders the footer with copyright and legal links", () => {
    render(<LandingPage />);

    expect(screen.getByText(/All rights reserved/)).toBeDefined();
    expect(screen.getByText("Terms of Service")).toBeDefined();
    expect(screen.getByText("Privacy")).toBeDefined();
  });
});
