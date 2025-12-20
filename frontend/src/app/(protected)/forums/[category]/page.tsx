"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, User, Clock } from "lucide-react";

export default function CategoryThreadsPage() {
  const params = useParams();
  const [threads, setThreads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadThreads() {
      const token = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      try {
        const res = await fetch(`${apiUrl}/api/forums/categories/${params.category}/threads`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setThreads(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadThreads();
  }, [params.category]);

  return (
    <div className="container max-w-6xl py-10 mx-auto">
      <div className="flex items-center justify-between mb-10 px-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight capitalize text-foreground">{params.category} Discussions</h1>
          <p className="text-muted-foreground mt-2">Latest topics in this category.</p>
        </div>
        <Button asChild>
          <Link href={`/forums/${params.category}/new`}>
            <Plus className="mr-2 h-4 w-4" />
            New Thread
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-20">Loading threads...</div>
      ) : (
        <div className="space-y-4">
          {threads.map((thread) => (
            <Link key={thread.id} href={`/forums/thread/${thread.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer bg-card border">
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-foreground">{thread.title}</CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Last active: {new Date(thread.last_activity).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Posted by {thread.author_id.slice(0, 8)}</span>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
          {threads.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground">
              No threads found. Be the first to start a conversation!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
