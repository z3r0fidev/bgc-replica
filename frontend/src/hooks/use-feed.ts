import { useState, useCallback, useRef } from "react";
import type { FeedPost } from "@/types/feed";

const MAX_FEED_ITEMS = 500;

export function useFeed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const isPruning = useRef(false);

  const addPosts = useCallback((newPosts: FeedPost[], position: "top" | "bottom" = "bottom") => {
    setPosts((prev) => {
      let combined = position === "top" ? [...newPosts, ...prev] : [...prev, ...newPosts];
      
      // Memory efficiency: prune if exceeding limit
      if (combined.length > MAX_FEED_ITEMS && !isPruning.current) {
        isPruning.current = true;
        combined = position === "top" ? combined.slice(0, MAX_FEED_ITEMS) : combined.slice(-MAX_FEED_ITEMS);
        isPruning.current = false;
      }
      
      return combined;
    });
  }, []);

  return {
    posts,
    setPosts,
    addPosts,
  };
}
