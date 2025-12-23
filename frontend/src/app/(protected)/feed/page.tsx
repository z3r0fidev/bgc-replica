"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FeedItem } from "@/components/feed/feed-item";
import { useAppStore } from "@/store/use-app-store";
import { offlineStorage } from "@/lib/offline-storage";
import { useFeed } from "@/hooks/use-feed";

export default function FeedPage() {
  const { posts, setPosts, addPosts } = useFeed();
  const [isLoading, setIsLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedType, setFeedType] = useState("global");
  const isOnline = useAppStore((state) => state.isOnline);

  const parentRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async (type: string = "global") => {
    setIsLoading(true);
    
    if (!isOnline) {
      const cachedPosts = await offlineStorage.getFeed();
      setPosts(cachedPosts);
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem("access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    
    try {
      const res = await fetch(`${apiUrl}/api/feed/?feed_type=${type}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.items || []);
        await offlineStorage.saveFeed(data.items || []);
      }
    } catch (e) {
      console.error(e);
      const cachedPosts = await offlineStorage.getFeed();
      setPosts(cachedPosts);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, setPosts]);

  useEffect(() => {
    loadFeed(feedType);
  }, [loadFeed, feedType]);

  const rowVirtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });

  const handlePostSubmit = async () => {
    if (!newPost.trim()) return;
    if (!isOnline) {
      toast.error("Cannot post while offline.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/feed/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ content: newPost }),
      });

      if (!response.ok) throw new Error("Post failed");

      const post = await response.json();
      addPosts([post], "top");
      await offlineStorage.saveFeed([post, ...posts]);
      setNewPost("");
      toast.success("Status updated!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-10 mx-auto space-y-8 px-4 h-[calc(100vh-4rem)] flex flex-col">
      <Card className="shadow-sm border-primary/10 shrink-0">
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-4">
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">ME</AvatarFallback>
            </Avatar>
            <Textarea 
              placeholder="What's on your mind?" 
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="min-h-[100px] border-none focus-visible:ring-0 text-lg resize-none p-0"
              disabled={!isOnline}
            />
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10" disabled={!isOnline}>
                <ImageIcon className="h-5 w-5" />
              </Button>
            </div>
            <Button onClick={handlePostSubmit} disabled={isSubmitting || !newPost.trim() || !isOnline}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Post</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="global" onValueChange={setFeedType} className="w-full flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 mb-6 shrink-0">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>
        <div ref={parentRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => (
              <div
                key={virtualItem.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <FeedItem post={posts[virtualItem.index]} />
              </div>
            ))}
          </div>
          {isLoading && (
            <div className="text-center py-10 text-muted-foreground italic flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading updates...
            </div>
          )}
          {!isLoading && posts.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground italic">
              No activity yet. Be the first to share something!
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
