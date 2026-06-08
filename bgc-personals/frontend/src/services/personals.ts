import { PaginatedResponse } from "@/types/common";
import { Profile } from "@/types/profile";
import * as Sentry from "@sentry/nextjs";

export interface PersonalCategory {
  name: string;
  slug: string;
  icon: string;
  banner: string;
}

export interface PersonalPost {
  id: string;
  author_id: string;
  category_slug: string;
  content: string;
  media_ids?: string[];
  follow_count: number;
  comment_count: number;
  created_at: string;
  author?: {
    id: string;
    name?: string;
    image?: string;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const personalsService = {
  async getCategories(): Promise<PersonalCategory[]> {
    return Sentry.startSpan(
      { name: "GET /api/personals/categories", op: "http.client" },
      async () => {
        const response = await fetch(`${API_URL}/api/personals/categories`);
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

        const response = await fetch(`${API_URL}/api/personals/listings?${searchParams.toString()}`);
        if (!response.ok) {
          const err = new Error("Failed to fetch listings");
          Sentry.captureException(err);
          throw err;
        }
        return response.json();
      }
    );
  },

  async getPosts(params: {
    category?: string;
    limit?: number;
    cursor?: string;
  }): Promise<PaginatedResponse<PersonalPost>> {
    return Sentry.startSpan(
      { name: "GET /api/personals/posts", op: "http.client" },
      async (span) => {
        const searchParams = new URLSearchParams();
        if (params.category) searchParams.set("category", params.category);
        if (params.limit) searchParams.set("limit", params.limit.toString());
        if (params.cursor) searchParams.set("cursor", params.cursor);

        span.setAttribute("query", searchParams.toString());

        const response = await fetch(`${API_URL}/api/personals/posts?${searchParams.toString()}`);
        if (!response.ok) {
          const err = new Error("Failed to fetch personal posts");
          Sentry.captureException(err);
          throw err;
        }
        return response.json();
      }
    );
  },
};
