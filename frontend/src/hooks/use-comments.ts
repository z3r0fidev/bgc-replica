"use client";

import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_id?: string;
  created_at: string;
  author?: {
    id: string;
    name?: string;
    image?: string;
  };
}

export function useComments(postId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/personals/posts/${postId}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();

    // Socket.io integration
    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || "http://127.0.0.1:8000", {
      path: "/socket.io",
    });

    newSocket.emit("join_post", { post_id: postId });

    newSocket.on("new_comment", (comment: Comment) => {
      if (comment.post_id === postId) {
        setComments((prev) => [...prev, comment]);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("leave_post", { post_id: postId });
      newSocket.close();
    };
  }, [postId, fetchComments]);

  const addComment = async (content: string, parentId?: string) => {
    try {
      const response = await fetch(`/api/personals/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parent_id: parentId }),
      });

      if (!response.ok) throw new Error("Failed to post comment");
      // The comment will be added via socket event
    } catch (error) {
      toast.error("Failed to post comment");
    }
  };

  return { comments, isLoading, addComment };
}
