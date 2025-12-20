"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Heart, Share2, Send, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function FeedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadFeed(type: string = "global") {
    setIsLoading(true);
    const token = localStorage.getItem("access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    
    try {
      const res = await fetch(`${apiUrl}/api/feed/?feed_type=${type}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFeed();
  }, []);

  const handlePostSubmit = async () => {
    if (!newPost.trim()) return;
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
      setPosts([post, ...posts]);
      setNewPost("");
      toast.success("Status updated!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-10 mx-auto space-y-8 px-4">
      {/* Create Post */}
      <Card className="shadow-sm border-primary/10">
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-4">
            <Avatar>
              <AvatarFallback>ME</AvatarFallback>
            </Avatar>
            <Textarea 
              placeholder="What's on your mind?" 
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="min-h-[100px] border-none focus-visible:ring-0 text-lg resize-none p-0"
            />
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10">
                <ImageIcon className="h-5 w-5" />
              </Button>
            </div>
            <Button onClick={handlePostSubmit} disabled={isSubmitting || !newPost.trim()}>
              {isSubmitting ? "Posting..." : <><Send className="mr-2 h-4 w-4" /> Post</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feed Tabs */}
      <Tabs defaultValue="global" onValueChange={loadFeed} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>
        <TabsContent value="global" className="space-y-4 mt-0">
          {isLoading ? (
            <div className="text-center py-20 text-muted-foreground">Loading feed...</div>
          ) : (
            posts.map((post) => <FeedItem key={post.id} post={post} />)
          )}
          {posts.length === 0 && !isLoading && (
            <div className="text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground italic">
              No activity yet. Be the first to share something!
            </div>
          )}
        </TabsContent>
        <TabsContent value="following" className="space-y-4 mt-0">
          <div className="text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground">
            Follow users to see their updates here.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FeedItem({ post }: { post: any }) {
  return (
    <Card className="hover:bg-muted/5 transition-colors border-primary/5">
      <CardHeader className="flex flex-row items-center gap-4 p-4">
        <Avatar>
          <AvatarFallback className="bg-primary/10 text-primary">{post.author_id.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <p className="font-bold text-sm">User {post.author_id.slice(0, 8)}</p>
          <p className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString()}</p>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-2">
        <p className="text-base leading-relaxed">{post.content}</p>
        {post.image_url && <img src={post.image_url} alt="Attachment" className="mt-4 rounded-xl border w-full max-h-96 object-cover" />}
      </CardContent>
      <CardFooter className="flex gap-4 p-4 border-t mt-4">
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">
          <Heart className="mr-2 h-4 w-4" /> Like
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">
          <MessageSquare className="mr-2 h-4 w-4" /> Comment
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground ml-auto">
          <Share2 className="mr-2 h-4 w-4" /> Share
        </Button>
      </CardFooter>
    </Card>
  );
}
