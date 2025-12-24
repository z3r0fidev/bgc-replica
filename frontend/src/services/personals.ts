import { PaginatedResponse } from "@/types/common";
import { Profile } from "@/types/profile";
import * as Sentry from "@sentry/nextjs";

export interface PersonalCategory {
  name: string;
  slug: string;
  icon: string;
  banner: string;
}

export const personalsService = {
  async getCategories(): Promise<PersonalCategory[]> {
    return Sentry.startSpan(
      { name: "GET /api/personals/categories", op: "http.client" },
      async () => {
        const response = await fetch("/api/personals/categories");
        if (!response.ok) {
          const err = new Error("Failed to fetch categories");
          Sentry.captureException(err);
          throw err;
        }
        return response.json();
      }
    );
  },

  async getListings(params: {
    category?: string;
    city?: string;
    state?: string;
    limit?: number;
    cursor?: string;
  }): Promise<PaginatedResponse<Profile>> {
    return Sentry.startSpan(
      { name: "GET /api/personals/listings", op: "http.client" },
      async (span) => {
        const searchParams = new URLSearchParams();
        if (params.category) searchParams.set("category", params.category);
        if (params.city) searchParams.set("city", params.city);
        if (params.state) searchParams.set("state", params.state);
        if (params.limit) searchParams.set("limit", params.limit.toString());
        if (params.cursor) searchParams.set("cursor", params.cursor);

        span.setAttribute("query", searchParams.toString());

        const response = await fetch(`/api/personals/listings?${searchParams.toString()}`);
        if (!response.ok) {
          const err = new Error("Failed to fetch listings");
          Sentry.captureException(err);
          throw err;
        }
        return response.json();
      }
    );
  },
};
