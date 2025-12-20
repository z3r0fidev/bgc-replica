"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TypingIndicator } from "./typing-indicator";
import { motion, AnimatePresence } from "framer-motion";

interface ChatWindowProps {
  conversationId?: string;
  roomId?: string;
  recipientName?: string;
  currentUserId: string;
}

export function ChatWindow({ conversationId, roomId, recipientName, currentUserId }: ChatWindowProps) {
  const { messages, sendMessage, setMessages, sendTyping, typingUsers } = useChat(roomId, conversationId);
  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const lastTypingTime = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const optimisticMessage = {
      id: Math.random().toString(),
      sender_id: currentUserId,
      content: input,
      conversation_id: conversationId,
      room_id: roomId,
      type: "TEXT" as const,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    sendMessage(input);
    setInput("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    const now = Date.now();
    if (now - lastTypingTime.current > 3000) {
      sendTyping();
      lastTypingTime.current = now;
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const token = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${apiUrl}/api/chat/media`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      sendMessage(data.url, "IMAGE");
      toast.success("Media sent!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="flex flex-col h-full w-full border-none shadow-none relative">
      <CardHeader className="border-b px-4 py-3 shrink-0">
        <CardTitle className="text-lg font-bold">
          {recipientName || "Chat Room"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0 bg-muted/5 relative">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4 pb-8">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-3 py-2 text-sm shadow-sm",
                  msg.sender_id === currentUserId
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-card border"
                )}
              >
                {msg.type === "IMAGE" ? (
                  <motion.img 
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    src={msg.url || msg.content} 
                    alt="Shared" 
                    className="rounded-md max-h-60 w-auto object-contain cursor-grab active:cursor-grabbing" 
                  />
                ) : (
                  msg.content
                )}
                <span className="text-[10px] opacity-70 self-end">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
        {typingUsers.size > 0 && (
          <div className="absolute bottom-0 left-0 w-full bg-background/80 backdrop-blur-sm border-t">
            <TypingIndicator username={Array.from(typingUsers)[0].slice(0, 8)} />
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t p-3 shrink-0">
        <div className="flex w-full items-center gap-2">
          <div className="relative">
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              onChange={handleUpload}
              disabled={isUploading}
              accept="image/*,video/*"
            />
            <Button variant="ghost" size="icon" className="shrink-0" disabled={isUploading}>
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
            </Button>
          </div>
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1"
            disabled={isUploading}
          />
          <Button size="icon" onClick={handleSend} className="shrink-0" disabled={isUploading || !input.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}