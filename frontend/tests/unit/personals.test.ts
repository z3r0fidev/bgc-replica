import { describe, it, expect, vi, beforeEach } from "vitest";
import { personalsService } from "../../src/services/personals";

global.fetch = vi.fn();

describe("personalsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches categories successfully", async () => {
    const mockCategories = [{ name: "Trans-X", slug: "transx" }];
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockCategories,
    });

    const result = await personalsService.getCategories();
    expect(result).toEqual(mockCategories);
    expect(fetch).toHaveBeenCalledWith("/api/personals/categories");
  });

  it("fetches listings with params", async () => {
    const mockResponse = { items: [], metadata: { has_next: false, count: 0 } };
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await personalsService.getListings({ category: "transx", city: "Philly" });
    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("category=transx"));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("city=Philly"));
  });

  it("throws error on failure", async () => {
    (fetch as any).mockResolvedValue({ ok: false });
    await expect(personalsService.getCategories()).rejects.toThrow("Failed to fetch categories");
  });
});
