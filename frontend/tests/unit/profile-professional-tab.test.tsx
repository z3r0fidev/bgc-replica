import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm, FormProvider, FieldValues } from "react-hook-form";
import { ProfessionalTab } from "../../src/components/profile/edit/tabs/ProfessionalTab";
import { PrivacySettings, PrivacyLevel } from "../../src/types/profile";

function TestProfessionalTab({
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
      occupation: "",
      industry: "",
      education_level: "",
      university: "",
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...form}>
      <ProfessionalTab
        form={form}
        privacySettings={privacySettings}
        onPrivacyChange={onPrivacyChange}
      />
    </FormProvider>
  );
}

describe("ProfessionalTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders occupation label and input", () => {
    render(<TestProfessionalTab />);
    expect(screen.getAllByText(/occupation/i).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/your job title or role/i)).toBeDefined();
  });

  it("allows typing in the occupation field", async () => {
    render(<TestProfessionalTab />);
    const input = screen.getByPlaceholderText(
      /your job title or role/i
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Software Engineer" } });

    await waitFor(() => {
      expect(input.value).toBe("Software Engineer");
    });
  });

  it("renders university label and input", () => {
    render(<TestProfessionalTab />);
    expect(screen.getAllByText(/university \/ alma mater/i).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/where did you study/i)).toBeDefined();
  });

  it("pre-fills values from defaultValues", () => {
    render(
      <TestProfessionalTab
        defaultValues={{ occupation: "Designer", university: "MIT" }}
      />
    );
    expect(
      (screen.getByPlaceholderText(/your job title or role/i) as HTMLInputElement).value
    ).toBe("Designer");
    expect(
      (screen.getByPlaceholderText(/where did you study/i) as HTMLInputElement).value
    ).toBe("MIT");
  });

  it("renders industry and education level labels", () => {
    render(<TestProfessionalTab />);
    expect(screen.getAllByText(/^industry$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/education level/i).length).toBeGreaterThan(0);
  });

  it("renders privacy toggles for all four fields", () => {
    render(<TestProfessionalTab />);
    expect(screen.getByTestId("privacy-toggle-occupation")).toBeDefined();
    expect(screen.getByTestId("privacy-toggle-industry")).toBeDefined();
    expect(screen.getByTestId("privacy-toggle-education_level")).toBeDefined();
    expect(screen.getByTestId("privacy-toggle-university")).toBeDefined();
  });

  it("reflects a non-default privacy setting value in the toggle", () => {
    render(
      <TestProfessionalTab privacySettings={{ occupation: "PRIVATE" }} />
    );
    expect(screen.getByText("Private")).toBeDefined();
  });
});
