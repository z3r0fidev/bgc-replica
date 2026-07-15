import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "../../src/components/theme-provider";

const nextThemesProviderMock = vi.fn(
  ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="next-themes-provider" data-props={JSON.stringify(props)}>
      {children}
    </div>
  )
);

vi.mock("next-themes", () => ({
  ThemeProvider: (props: React.PropsWithChildren<Record<string, unknown>>) =>
    nextThemesProviderMock(props),
}));

describe("ThemeProvider", () => {
  it("renders its children through next-themes' ThemeProvider", () => {
    render(
      <ThemeProvider>
        <p>App content</p>
      </ThemeProvider>
    );
    expect(screen.getByText("App content")).toBeDefined();
    expect(screen.getByTestId("next-themes-provider")).toBeDefined();
  });

  it("forwards additional props to the underlying next-themes ThemeProvider", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <p>App content</p>
      </ThemeProvider>
    );
    const el = screen.getByTestId("next-themes-provider");
    const props = JSON.parse(el.getAttribute("data-props")!);
    expect(props).toMatchObject({
      attribute: "class",
      defaultTheme: "system",
      enableSystem: true,
    });
  });
});
