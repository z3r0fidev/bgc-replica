import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm, FormProvider, FieldValues } from "react-hook-form";
import { LifestyleTab } from "../../src/components/profile/edit/tabs/LifestyleTab";
import { PrivacySettings, PrivacyLevel } from "../../src/types/profile";

function TestLifestyleTab({
  defaultValues = {},
  privacySettings = {},
  onPrivacyChange = vi.fn(),
}: {
  defaultValues?: Record<string, unknown>;
  privacySettings?: PrivacySettings;
  onPrivacyChange?: (field: string, level: PrivacyLevel) => void;
}) {
  const form = useForm<FieldValues>({
    defaultValues: {
      relationship_status: "",
      looking_for: [],
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...form}>
      <LifestyleTab
        form={form}
        privacySettings={privacySettings}
        onPrivacyChange={onPrivacyChange}
      />
    </FormProvider>
  );
}

describe("LifestyleTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the relationship status label", () => {
    render(<TestLifestyleTab />);
    expect(screen.getAllByText(/relationship status/i).length).toBeGreaterThan(0);
  });

  it("renders the looking for label and description", () => {
    render(<TestLifestyleTab />);
    expect(screen.getAllByText(/looking for/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/select all that apply/i)).toBeDefined();
  });

  it("renders a checkbox for every LOOKING_FOR option", () => {
    render(<TestLifestyleTab />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(7);
  });

  it("pre-checks options that are present in defaultValues.looking_for", () => {
    render(
      <TestLifestyleTab defaultValues={{ looking_for: ["Dating", "Networking"] }} />
    );
    const datingCheckbox = screen.getByLabelText("Dating") as HTMLInputElement;
    const networkingCheckbox = screen.getByLabelText("Networking") as HTMLInputElement;
    const friendshipCheckbox = screen.getByLabelText("Friendship") as HTMLInputElement;

    expect(datingCheckbox.checked).toBe(true);
    expect(networkingCheckbox.checked).toBe(true);
    expect(friendshipCheckbox.checked).toBe(false);
  });

  it("checking a box adds the option to looking_for", async () => {
    render(<TestLifestyleTab />);
    const casualCheckbox = screen.getByLabelText("Casual") as HTMLInputElement;

    fireEvent.click(casualCheckbox);

    await waitFor(() => {
      expect(casualCheckbox.checked).toBe(true);
    });
  });

  it("unchecking a pre-checked box removes the option from looking_for", async () => {
    render(<TestLifestyleTab defaultValues={{ looking_for: ["Dating", "Casual"] }} />);
    const datingCheckbox = screen.getByLabelText("Dating") as HTMLInputElement;
    expect(datingCheckbox.checked).toBe(true);

    fireEvent.click(datingCheckbox);

    await waitFor(() => {
      expect(datingCheckbox.checked).toBe(false);
    });

    // The other pre-checked option should be untouched
    const casualCheckbox = screen.getByLabelText("Casual") as HTMLInputElement;
    expect(casualCheckbox.checked).toBe(true);
  });

  it("renders privacy toggles for relationship_status and looking_for", () => {
    render(<TestLifestyleTab />);
    expect(screen.getByTestId("privacy-toggle-relationship_status")).toBeDefined();
    expect(screen.getByTestId("privacy-toggle-looking_for")).toBeDefined();
  });

  it("calls onPrivacyChange when a privacy toggle value changes", () => {
    const onPrivacyChange = vi.fn();
    render(<TestLifestyleTab onPrivacyChange={onPrivacyChange} />);
    // Rendered with default PUBLIC value since privacySettings is empty
    expect(
      screen.getByTestId("privacy-toggle-relationship_status").getAttribute("aria-label")
    ).toBe("Privacy setting for relationship status");
  });
});
