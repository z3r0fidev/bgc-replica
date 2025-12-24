import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VirtualizedListingView } from "../../src/components/personals/list";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn(() => ({
    getVirtualItems: () => [
      { key: "0", index: 0, start: 0, size: 120 },
      { key: "1", index: 1, start: 120, size: 120 },
    ],
    getTotalSize: () => 240,
  })),
}));

vi.mock("../../src/components/personals/row", () => ({
  PersonalListingRow: ({ profile }: any) => <div data-testid="row">{profile.user.name}</div>,
}));

describe("VirtualizedListingView", () => {
  const mockProfiles = [
    { id: "1", user: { name: "User 1", image: "" }, location_city: "Philly", last_active: new Date().toISOString() },
    { id: "2", user: { name: "User 2", image: "" }, location_city: "Jersey", last_active: new Date().toISOString() },
  ] as any;

  it("renders virtualized rows correctly", () => {
    render(
      <VirtualizedListingView 
        items={mockProfiles} 
        hasNext={false} 
        onLoadMore={() => {}} 
        isLoading={false} 
      />
    );

    expect(screen.getByText("User 1")).toBeDefined();
    expect(screen.getByText("User 2")).toBeDefined();
  });

  it("shows empty state when no items", () => {
    render(
      <VirtualizedListingView 
        items={[]} 
        hasNext={false} 
        onLoadMore={() => {}} 
        isLoading={false} 
      />
    );

    expect(screen.getByText(/No listings found/i)).toBeDefined();
  });
});
