"use client";

import React from "react";
import { useForumStats } from "@/hooks/use-forum-stats";
import { Users } from "lucide-react";

export function ForumStats({ forumId }: { forumId: string }) {
  const { activeUsers } = useForumStats(forumId);

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20">
      <Users size={12} className="text-white/60 animate-pulse" />
      <span className="text-[10px] font-black uppercase tracking-widest text-white">
        {activeUsers} ACTIVE
      </span>
    </div>
  );
}
