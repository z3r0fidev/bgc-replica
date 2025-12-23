"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Rss, Hash, Loader2, Info } from "lucide-react";
import { FeedItem } from "@/components/feed/feed-item";

export default function TopicalHubPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [isLoading, setIsLoading] = useState(true);
  const [topicData, setTopicData] = useState<any>(null);

  // Formatting slug for display (e.g. "hot-topics" -> "Hot Topics")
  const displayName = slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

  useEffect(() => {
    // Simulate fetching topic-specific aggregated content
    // In a real implementation, this would call a dedicated aggregation endpoint
    setTimeout(() => {
      setTopicData({
        name: displayName,
        description: `Everything you need to know about ${displayName} within the BGC community.`,
        forumThreads: [],
        feedPosts: [],
      });
      setIsLoading(false);
    }, 1000);
  }, [slug, displayName]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span>Curating topical content...</span>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-10 mx-auto px-4">
      <div className="bg-primary/5 rounded-[3rem] p-8 md:p-12 mb-12 border-2 border-primary/10">
        <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] mb-4">
          <Hash className="h-5 w-5" />
          <span>Topical Hub</span>
        </div>
        <h1 className="text-6xl font-black tracking-tighter text-foreground mb-6 leading-none">
          {topicData.name}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
          {topicData.description}
        </p>
      </div>

      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-8">
          <TabsTrigger value="feed" className="gap-2">
            <Rss className="h-4 w-4" /> Discussion Feed
          </TabsTrigger>
          <TabsTrigger value="forums" className="gap-2">
            <MessageSquare className="h-4 w-4" /> Related Forums
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <div className="grid gap-6">
            {topicData.feedPosts.length === 0 ? (
              <Card className="border-dashed border-4 rounded-[2rem] bg-muted/5">
                <CardContent className="py-20 text-center">
                  <Rss className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-xl font-bold text-muted-foreground">No feed updates yet</p>
                  <p className="text-muted-foreground">Be the first to post about {topicData.name} in your status!</p>
                </CardContent>
              </Card>
            ) : (
              topicData.feedPosts.map((post: any) => (
                <FeedItem key={post.id} post={post} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="forums">
          <div className="grid gap-4">
            {topicData.forumThreads.length === 0 ? (
              <Card className="border-dashed border-4 rounded-[2rem] bg-muted/5">
                <CardContent className="py-20 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-xl font-bold text-muted-foreground">No active forum threads</p>
                  <p className="text-muted-foreground">Check out the main Discussion Boards for more conversations.</p>
                </CardContent>
              </Card>
            ) : (
              topicData.forumThreads.map((thread: any) => (
                <Card key={thread.id}>
                  <CardHeader>
                    <CardTitle>{thread.title}</CardTitle>
                    <CardDescription>{thread.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
