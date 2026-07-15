import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm, FormProvider, FieldValues } from "react-hook-form";
import { SocialLinksTab } from "../../src/components/profile/edit/tabs/SocialLinksTab";
import { PrivacySettings, PrivacyLevel } from "../../src/types/profile";

function TestSocialLinksTab({
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
      social_links: {
        instagram_url: "",
        x_url: "",
        tiktok_url: "",
        website_url: "",
      },
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...form}>
      <SocialLinksTab
        form={form}
        privacySettings={privacySettings}
        onPrivacyChange={onPrivacyChange}
      />
    </FormProvider>
  );
}

describe("SocialLinksTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all four social link fields with placeholders", () => {
    render(<TestSocialLinksTab />);
    expect(
      screen.getByPlaceholderText(/https:\/\/instagram\.com\/username/i)
    ).toBeDefined();
    expect(screen.getByPlaceholderText(/https:\/\/x\.com\/username/i)).toBeDefined();
    expect(
      screen.getByPlaceholderText(/https:\/\/tiktok\.com\/@username/i)
    ).toBeDefined();
    expect(screen.getByPlaceholderText(/https:\/\/yoursite\.com/i)).toBeDefined();
  });

  it("renders the section heading explaining social link visibility", () => {
    render(<TestSocialLinksTab />);
    expect(screen.getByText(/social link visibility/i)).toBeDefined();
    expect(
      screen.getByText(/controls who can see all your social links/i)
    ).toBeDefined();
  });

  it("allows typing into the Instagram field", async () => {
    render(<TestSocialLinksTab />);
    const input = screen.getByPlaceholderText(
      /https:\/\/instagram\.com\/username/i
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "https://instagram.com/me" } });

    await waitFor(() => {
      expect(input.value).toBe("https://instagram.com/me");
    });
  });

  it("pre-fills fields from defaultValues.social_links", () => {
    render(
      <TestSocialLinksTab
        defaultValues={{
          social_links: {
            instagram_url: "https://instagram.com/jane",
            x_url: "",
            tiktok_url: "",
            website_url: "https://jane.dev",
          },
        }}
      />
    );
    expect(
      (screen.getByPlaceholderText(/https:\/\/instagram\.com\/username/i) as HTMLInputElement)
        .value
    ).toBe("https://instagram.com/jane");
    expect(
      (screen.getByPlaceholderText(/https:\/\/yoursite\.com/i) as HTMLInputElement).value
    ).toBe("https://jane.dev");
  });

  it("renders a single privacy toggle scoped to social_links (not per-field)", () => {
    render(<TestSocialLinksTab />);
    expect(screen.getByTestId("privacy-toggle-social_links")).toBeDefined();
    // Only one privacy toggle should exist for the whole tab
    expect(screen.getAllByTestId(/privacy-toggle/).length).toBe(1);
  });

  it("calls onPrivacyChange with 'social_links' as the field when changed", () => {
    render(<TestSocialLinksTab />);
    expect(
      screen.getByTestId("privacy-toggle-social_links").getAttribute("aria-label")
    ).toBe("Privacy setting for social links");
  });
});
