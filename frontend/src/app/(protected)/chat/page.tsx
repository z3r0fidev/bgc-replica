"use client";

import { useState, useEffect } from "react";
import { ChatWindow } from "@/components/chat/chat-window";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    async function loadConversations() {
      const token = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      try {
        const res = await fetch(`${apiUrl}/api/chat/conversations`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
        }

        const meRes = await fetch(`${apiUrl}/api/auth/me`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (meRes.ok) {
          const me = await meRes.json();
          setCurrentUserId(me.id);
        }
      } catch (e) {
        console.error("Failed to fetch data", e);
      }
    }
    loadConversations();
  }, []);

  return (
    <div className="container flex h-[calc(100vh-8rem)] max-w-6xl py-6 gap-6 mx-auto">
      <div className="w-1/3 flex flex-col gap-4">
        <h1 className="text-2xl font-bold px-2">Messages</h1>
        <ScrollArea className="flex-1 border rounded-xl bg-card">
          <div className="p-2 space-y-2">
            {conversations.map((conv) => (
              <Card 
                key={conv.id} 
                className={cn(
                  "cursor-pointer hover:bg-muted transition-colors border-none shadow-none",
                  selectedId === conv.id && "bg-muted"
                )}
                onClick={() => setSelectedId(conv.id)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary uppercase">
                      {conv.id.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-bold truncate text-sm text-foreground">
                      Conversation {conv.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate italic">
                      Click to start chatting
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {conversations.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-sm">No active conversations.</p>
                <p className="text-xs mt-1">Start a chat from a user profile.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      <div className="flex-1 flex flex-col border rounded-xl bg-card overflow-hidden">
        {selectedId ? (
          <ChatWindow 
            conversationId={selectedId} 
            currentUserId={currentUserId}
            recipientName={`User ${selectedId.slice(0, 8)}`}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground italic bg-muted/30">
            Select a conversation to start chatting.
          </div>
        )}
      </div>
    </div>
  );
}