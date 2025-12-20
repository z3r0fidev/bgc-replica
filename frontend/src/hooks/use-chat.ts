"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/providers/socket-provider";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  room_id?: string;
  conversation_id?: string;
  type: "TEXT" | "IMAGE" | "VIDEO" | "SYSTEM";
  created_at: string;
  url?: string;
};

export const useChat = (roomId?: string, conversationId?: string) => {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket || !isConnected) return;

    if (roomId) {
      socket.emit("join_room", { room_id: roomId });
      
      socket.on("new_room_message", (message: Message) => {
        if (message.room_id === roomId) {
          setMessages((prev) => [...prev, message]);
        }
      });
    }

    if (conversationId) {
      socket.on("new_dm", (message: Message) => {
        if (message.conversation_id === conversationId) {
          setMessages((prev) => [...prev, message]);
        }
      });
    }

    socket.on("user_typing", ({ user_id, is_typing }: { user_id: string, is_typing: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (is_typing) next.add(user_id);
        else next.delete(user_id);
        return next;
      });

      // Auto-clear typing indicator after 5s if no stop event
      if (is_typing) {
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(user_id);
            return next;
          });
        }, 5000);
      }
    });

    return () => {
      socket.off("new_room_message");
      socket.off("new_dm");
      socket.off("user_typing");
    };
  }, [socket, isConnected, roomId, conversationId]);

  const sendTyping = useCallback(() => {
    if (!socket || !isConnected) return;
    socket.emit("typing", { room_id: roomId, recipient_id: conversationId });
  }, [socket, isConnected, roomId, conversationId]);

  const sendMessage = useCallback((content: string, type: "TEXT" | "IMAGE" = "TEXT") => {
    if (!socket || !isConnected) return;

    if (roomId) {
      socket.emit("send_room_message", { room_id: roomId, content, type });
    } else if (conversationId) {
      // In a real scenario, we might need recipient_id here or the conversation_id
      socket.emit("send_dm", { conversation_id: conversationId, content, type });
    }
  }, [socket, isConnected, roomId, conversationId]);

  return {
    messages,
    setMessages,
    sendMessage,
    sendTyping,
    typingUsers,
    isConnected,
  };
};
