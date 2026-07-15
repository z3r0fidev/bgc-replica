import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OfflinePage from "../../src/app/offline/page";

interface LocationMock {
  href: string;
  reload: () => void;
}

let locationMock: LocationMock;

describe("OfflinePage", () => {
  beforeEach(() => {
    locationMock = { href: "", reload: vi.fn() };
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: locationMock,
    });
  });

  it("shows the offline UI when navigator.onLine is false", () => {
    Object.defineProperty(window.navigator, "onLine", {
      value: false,
      configurable: true,
    });

    render(<OfflinePage />);

    expect(screen.getByText("You're Offline")).toBeDefined();
    expect(locationMock.href).toBe("");
  });

  it("redirects to '/' when the browser reports online on mount", () => {
    Object.defineProperty(window.navigator, "onLine", {
      value: true,
      configurable: true,
    });

    render(<OfflinePage />);

    expect(locationMock.href).toBe("/");
  });

  it("calls window.location.reload when 'Try Again' is clicked", () => {
    Object.defineProperty(window.navigator, "onLine", {
      value: false,
      configurable: true,
    });

    render(<OfflinePage />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(locationMock.reload).toHaveBeenCalled();
  });

  it("redirects to '/' once the 'online' browser event fires", () => {
    Object.defineProperty(window.navigator, "onLine", {
      value: false,
      configurable: true,
    });

    render(<OfflinePage />);
    expect(screen.getByText("You're Offline")).toBeDefined();

    fireEvent(window, new Event("online"));

    expect(locationMock.href).toBe("/");
  });

  it("shows the offline UI again once the 'offline' browser event fires", () => {
    Object.defineProperty(window.navigator, "onLine", {
      value: true,
      configurable: true,
    });

    render(<OfflinePage />);
    // Starting online triggers the redirect effect immediately.
    expect(locationMock.href).toBe("/");

    fireEvent(window, new Event("offline"));

    expect(screen.getByText("You're Offline")).toBeDefined();
  });
});
