"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Loader2, User, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function StoriesPage() {
  const [stories, setStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStories() {
      const token = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      try {
        const res = await fetch(`${apiUrl}/api/stories/`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStories(data.items || []);
        }
      } catch (e) {
        console.error("Failed to load stories", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadStories();
  }, []);

  return (
    <div className="container max-w-5xl py-10 mx-auto px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-16 gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-foreground mb-4">
            Community Stories
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Narratives, fiction, and experiences shared by members of the BGC community.
          </p>
        </div>
        <Button size="lg" className="neo-brutal group">
          <Plus className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90" />
          Share Your Story
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="text-lg">Flipping through pages...</span>
        </div>
      ) : (
        <div className="space-y-12">
          {stories.map((story) => (
            <Card key={story.id} className="border-none shadow-none bg-transparent group cursor-pointer overflow-visible">
              <div className="flex flex-col md:flex-row gap-8">
                {story.cover_url && (
                  <div className="w-full md:w-1/3 aspect-[4/3] rounded-2xl overflow-hidden neo-brutal shrink-0">
                    <img 
                      src={story.cover_url} 
                      alt={story.title} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                    <BookOpen className="h-3 w-3" />
                    <span>Member Submission</span>
                  </div>
                  <h2 className="text-3xl font-bold group-hover:text-primary transition-colors leading-tight">
                    {story.title}
                  </h2>
                  <p className="text-muted-foreground text-lg line-clamp-3 leading-relaxed">
                    {story.content}
                  </p>
                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span className="font-medium">User {story.user_id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(story.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button variant="link" className="group/btn p-0 text-primary font-bold text-lg">
                      Read Full Story 
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="h-px w-full bg-border mt-12 opacity-50" />
            </Card>
          ))}
          
          {stories.length === 0 && (
            <div className="py-40 text-center border-2 border-dashed rounded-[3rem] bg-muted/10">
              <BookOpen className="h-20 w-20 mx-auto mb-6 opacity-10" />
              <h2 className="text-3xl font-bold text-muted-foreground">The library is currently empty</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">Be the first to share your experiences or fiction with the community.</p>
              <Button className="mt-8 neo-brutal" size="lg">Start Writing</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
