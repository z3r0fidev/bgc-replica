"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { User, Reply, Send } from "lucide-react";
import { toast } from "sonner";

export default function ThreadDetailPage() {
  const params = useParams();
  const [thread, setThread] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      const token = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      try {
        // Fetch thread details (could add endpoint for single thread)
        // For now, fetch posts and find parent? Better to have dedicated GET /api/forums/threads/{id}
        const res = await fetch(`${apiUrl}/api/forums/threads/${params.id}/posts`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
  }, [params.id]);

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/forums/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          thread_id: params.id,
          content: replyText
        }),
      });

      if (!response.ok) throw new Error("Reply failed");

      const newPost = await response.json();
      setPosts([...posts, newPost]);
      setReplyText("");
      toast.success("Reply posted!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-4xl py-10 mx-auto space-y-8">
      {/* Root Post (Placeholder until single thread endpoint added) */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center gap-4 border-b">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Thread Discussion</CardTitle>
            <p className="text-xs text-muted-foreground">Original Topic</p>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-foreground leading-relaxed italic">Thread details loading or fetching...</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-bold px-2">Replies</h3>
        {posts.map((post) => (
          <Card key={post.id} className="ml-4 md:ml-8 border-l-4 border-l-primary/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <User className="h-3 w-3" />
                <span>User {post.author_id.slice(0, 8)}</span>
                <span>•</span>
                <span>{new Date(post.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm">{post.content}</p>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground">
                  <Reply className="mr-1 h-3 w-3" />
                  Reply
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="pt-10">
        <Card className="bg-card shadow-lg ring-1 ring-primary/10">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-bold">Write a Reply</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <Textarea 
              placeholder="What are your thoughts?" 
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[120px] focus-visible:ring-primary"
            />
            <div className="flex justify-end">
              <Button onClick={handleSubmitReply} disabled={isSubmitting || !replyText.trim()}>
                {isSubmitting ? "Posting..." : <><Send className="mr-2 h-4 w-4" /> Post Reply</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
