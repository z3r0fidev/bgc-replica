"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/providers/socket-provider";

export const useForumStats = (forumId: string) => {
  const { socket, isConnected } = useSocket();
  const [activeUsers, setActiveUsers] = useState<number>(0);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit("join_forum", { forum_id: forumId });

    socket.on("forum_stats_update", (data: { forum_id: string; active_users: number }) => {
      if (data.forum_id === forumId) {
        setActiveUsers(data.active_users);
      }
    });

    return () => {
      socket.emit("leave_forum", { forum_id: forumId });
      socket.off("forum_stats_update");
    };
  }, [socket, isConnected, forumId]);

  return { activeUsers };
};
