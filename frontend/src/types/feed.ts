// Feed types for BGC Replica

export interface FeedPost {
  id: string;
  author_id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  updated_at?: string;
  likes_count?: number;
  comments_count?: number;
}

export interface ForumThread {
  id: string;
  title: string;
  content?: string;
  author_id: string;
  category_id: string;
  created_at: string;
  last_activity?: string;
  reply_count?: number;
  view_count?: number;
}
