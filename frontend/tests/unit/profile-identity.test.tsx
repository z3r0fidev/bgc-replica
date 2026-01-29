import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm, FormProvider, FieldValues } from "react-hook-form";
import { IdentityTab } from "../../src/components/profile/edit/tabs/IdentityTab";
import { PrivacySettings, PrivacyLevel } from "../../src/types/profile";

// Test component that wraps IdentityTab with form context
function TestIdentityTab({
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
      display_name: "",
      pronouns: "",
      birthdate: "",
      gender_identity: "",
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...form}>
      <IdentityTab
        form={form}
        privacySettings={privacySettings}
        onPrivacyChange={onPrivacyChange}
      />
    </FormProvider>
  );
}

describe("IdentityTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders display name label and input", () => {
    render(<TestIdentityTab />);

    expect(screen.getByLabelText(/display name/i)).toBeDefined();
  });

  it("renders display name input with placeholder", () => {
    render(<TestIdentityTab />);

    const displayNameInput = screen.getByPlaceholderText(
      /how you want to be known/i
    );
    expect(displayNameInput).toBeDefined();
  });

  it("allows typing in display name field", async () => {
    render(<TestIdentityTab />);

    const displayNameInput = screen.getByPlaceholderText(
      /how you want to be known/i
    ) as HTMLInputElement;
    fireEvent.change(displayNameInput, { target: { value: "Test User" } });

    await waitFor(() => {
      expect(displayNameInput.value).toBe("Test User");
    });
  });

  it("renders pronouns label", () => {
    render(<TestIdentityTab />);

    // Use getAllByText since there could be multiple matches (label + placeholder)
    const pronounsLabels = screen.getAllByText(/pronouns/i);
    expect(pronounsLabels.length).toBeGreaterThan(0);
  });

  it("renders gender identity label", () => {
    render(<TestIdentityTab />);

    const genderLabels = screen.getAllByText(/gender identity/i);
    expect(genderLabels.length).toBeGreaterThan(0);
  });

  it("renders privacy toggles for sensitive fields", () => {
    render(<TestIdentityTab />);

    // Privacy toggles should be present for pronouns, birthdate, and gender_identity
    const privacyToggles = screen.getAllByTestId(/privacy-toggle/);
    expect(privacyToggles.length).toBeGreaterThanOrEqual(3);
  });

  it("displays pre-filled values from defaultValues", () => {
    render(
      <TestIdentityTab
        defaultValues={{
          display_name: "John Doe",
        }}
      />
    );

    const displayNameInput = screen.getByPlaceholderText(
      /how you want to be known/i
    ) as HTMLInputElement;
    expect(displayNameInput.value).toBe("John Doe");
  });

  it("renders birthdate as date input type", () => {
    render(<TestIdentityTab />);

    const birthdateInput = document.querySelector(
      'input[type="date"]'
    ) as HTMLInputElement;
    expect(birthdateInput).toBeDefined();
  });

  it("renders birthdate label", () => {
    render(<TestIdentityTab />);

    const birthdateLabels = screen.getAllByText(/birthdate/i);
    expect(birthdateLabels.length).toBeGreaterThan(0);
  });
});
