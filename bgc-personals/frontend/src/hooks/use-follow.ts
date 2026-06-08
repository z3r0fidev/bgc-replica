"use client";

import { useState } from "react";
import { toast } from "sonner";

export function useFollow(postId: string, initialFollowing: boolean, initialCount: number) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [isPending, setIsPending] = useState(false);

  const toggleFollow = async () => {
    if (isPending) return;

    const previousFollowing = following;
    const previousCount = count;

    setFollowing(!previousFollowing);
    setCount(previousFollowing ? previousCount - 1 : previousCount + 1);
    setIsPending(true);

    try {
      const response = await fetch(`/api/personals/posts/${postId}/follow`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to toggle follow");

      const data = await response.json();
      setFollowing(data.following);
      setCount(data.count);
    } catch (error) {
      setFollowing(previousFollowing);
      setCount(previousCount);
      toast.error("Failed to update follow status");
    } finally {
      setIsPending(false);
    }
  };

  return { following, count, toggleFollow, isPending };
}
