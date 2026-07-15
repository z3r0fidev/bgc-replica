import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WarningHistoryList } from "../../src/components/admin/WarningHistoryList";
import type { WarningItem } from "../../src/types/admin";

function makeWarning(overrides: Partial<WarningItem>): WarningItem {
  return {
    id: "w-1",
    user_id: "u-1",
    admin_id: "a-1",
    admin_name: "Moderator Mo",
    report_id: null,
    reason: "Spam links",
    severity: "MEDIUM",
    status: "ACTIVE",
    triggered_escalation: false,
    created_at: "2024-01-15T10:00:00Z",
    ...overrides,
  };
}

describe("WarningHistoryList", () => {
  it("renders an empty state with a clean-record message when there are no warnings", () => {
    render(<WarningHistoryList warnings={[]} threshold={3} />);
    expect(screen.getByText(/no warnings on record/i)).toBeDefined();
    expect(screen.getByText(/clean record/i)).toBeDefined();
  });

  it("renders one entry per warning with the admin name and reason", () => {
    const warnings = [makeWarning({ id: "w-1" })];
    render(<WarningHistoryList warnings={warnings} threshold={3} />);
    expect(screen.getByText(/By: Moderator Mo/)).toBeDefined();
    expect(screen.getByText("Spam links")).toBeDefined();
  });

  it("falls back to 'System' when admin_name is null", () => {
    const warnings = [makeWarning({ admin_name: null })];
    render(<WarningHistoryList warnings={warnings} threshold={3} />);
    expect(screen.getByText(/By: System/)).toBeDefined();
  });

  it("assigns chronological position labels, newest-first input becomes highest-position-first", () => {
    // Newest-first order (as documented): index 0 is most recent -> position = total - index.
    const warnings = [
      makeWarning({ id: "w-newest" }),
      makeWarning({ id: "w-middle" }),
      makeWarning({ id: "w-oldest" }),
    ];
    render(<WarningHistoryList warnings={warnings} threshold={3} />);

    expect(screen.getByText("Warning 3 of 3")).toBeDefined();
    expect(screen.getByText("Warning 2 of 3")).toBeDefined();
    expect(screen.getByText("Warning 1 of 3")).toBeDefined();
  });

  it("shows a status badge when status is not ACTIVE", () => {
    const warnings = [makeWarning({ status: "REVOKED" })];
    render(<WarningHistoryList warnings={warnings} threshold={3} />);
    expect(screen.getByText("REVOKED")).toBeDefined();
  });

  it("does not show a status badge when status is ACTIVE", () => {
    const warnings = [makeWarning({ status: "ACTIVE" })];
    render(<WarningHistoryList warnings={warnings} threshold={3} />);
    expect(screen.queryByText("ACTIVE")).toBeNull();
  });

  it("shows a 'Triggered Suspension' badge when triggered_escalation is true", () => {
    const warnings = [makeWarning({ triggered_escalation: true })];
    render(<WarningHistoryList warnings={warnings} threshold={3} />);
    expect(screen.getByText("Triggered Suspension")).toBeDefined();
  });

  it("does not show the escalation badge when triggered_escalation is false", () => {
    const warnings = [makeWarning({ triggered_escalation: false })];
    render(<WarningHistoryList warnings={warnings} threshold={3} />);
    expect(screen.queryByText("Triggered Suspension")).toBeNull();
  });

  it("applies the amber border/chip tier for positions well below threshold", () => {
    const warnings = [
      makeWarning({ id: "w-1" }),
      makeWarning({ id: "w-2" }),
      makeWarning({ id: "w-3" }),
      makeWarning({ id: "w-4" }),
      makeWarning({ id: "w-5" }),
    ];
    // threshold=5, 5 warnings newest-first -> positions 5,4,3,2,1
    const { container } = render(<WarningHistoryList warnings={warnings} threshold={5} />);
    const rows = container.querySelectorAll(".border-l-4");
    expect(rows.length).toBe(5);
    // Last row (oldest, position 1) should be amber-tier
    expect(rows[4].className).toContain("amber");
  });

  it("applies the orange border/chip tier at position threshold - 1", () => {
    const warnings = [makeWarning({ id: "w-1" }), makeWarning({ id: "w-2" })];
    // threshold=3, 2 warnings -> positions 2 (newest, index0) and 1 (oldest, index1)
    const { container } = render(<WarningHistoryList warnings={warnings} threshold={3} />);
    const rows = container.querySelectorAll(".border-l-4");
    expect(rows[0].className).toContain("orange"); // position 2 = threshold - 1
  });

  it("applies the destructive border/chip tier at and beyond the threshold position", () => {
    const warnings = [makeWarning({ id: "w-1" }), makeWarning({ id: "w-2" }), makeWarning({ id: "w-3" })];
    // threshold=3, 3 warnings -> positions 3,2,1; position 3 = threshold reached
    const { container } = render(<WarningHistoryList warnings={warnings} threshold={3} />);
    const rows = container.querySelectorAll(".border-l-4");
    expect(rows[0].className).toContain("destructive");
  });

  it("formats the created_at date using toLocaleString", () => {
    const warnings = [makeWarning({ created_at: "2024-01-15T10:00:00Z" })];
    render(<WarningHistoryList warnings={warnings} threshold={3} />);
    const expected = new Date("2024-01-15T10:00:00Z").toLocaleString();
    expect(screen.getByText(expected)).toBeDefined();
  });
});
