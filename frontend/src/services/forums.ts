import { PaginatedResponse } from "@/types/common";

export interface ForumCategoryTree {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id: string | null;
  icon_path?: string;
  banner_path?: string;
  children: ForumCategoryTree[];
}

export interface ThreadAuthor {
  name: string;
  avatar?: string;
}

export interface ThreadStats {
  replies: number;
  views: number;
}

export interface ForumThread {
  id: string;
  title: string;
  author: ThreadAuthor;
  stats: ThreadStats;
  last_post: {
    user: ThreadAuthor;
    created_at: string;
  };
  is_sticky: boolean;
  is_hot: boolean;
}

export const forumsService = {
  async getTree(): Promise<ForumCategoryTree[]> {
    const response = await fetch("/api/forums/tree");
    if (!response.ok) throw new Error("Failed to fetch forum tree");
    return response.json();
  },

  async getThreads(
    categorySlug: string,
    params: { limit?: number; cursor?: string } = {}
  ): Promise<PaginatedResponse<ForumThread>> {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.set("limit", params.limit.toString());
    if (params.cursor) searchParams.set("cursor", params.cursor);

    const response = await fetch(
      `/api/forums/categories/${categorySlug}/threads?${searchParams.toString()}`
    );
    if (!response.ok) throw new Error("Failed to fetch threads");
    return response.json();
  },
};
