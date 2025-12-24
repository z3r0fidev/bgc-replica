import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FeaturedListsSidebar } from "../../src/components/personals/sidebar";
import { personalsService } from "../../src/services/personals";
import { useParams } from "next/navigation";

vi.mock("../../src/services/personals", () => ({
  personalsService: {
    getCategories: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

describe("FeaturedListsSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useParams as any).mockReturnValue({ category: "transx" });
  });

  it("renders categories correctly", async () => {
    const mockCategories = [
      { name: "Trans-X", slug: "transx", icon: "/icon.png", banner: "/banner.png" },
      { name: "MILFY", slug: "milfy", icon: "/milfy.png", banner: "/milfy-banner.png" },
    ];
    (personalsService.getCategories as any).mockResolvedValue(mockCategories);

    render(<FeaturedListsSidebar />);

    await waitFor(() => {
      expect(screen.getByText("Trans-X")).toBeDefined();
      expect(screen.getByText("MILFY")).toBeDefined();
    });
  });

  it("highlights the active category", async () => {
    const mockCategories = [{ name: "Trans-X", slug: "transx", icon: "/icon.png", banner: "/banner.png" }];
    (personalsService.getCategories as any).mockResolvedValue(mockCategories);

    const { container } = render(<FeaturedListsSidebar />);

    await waitFor(() => {
      const link = container.querySelector('a[href="/personals/transx"]');
      expect(link?.className).toContain("bg-white/20");
    });
  });
});
