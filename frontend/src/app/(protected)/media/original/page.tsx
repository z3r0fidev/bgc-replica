"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Tv, Loader2, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function OriginalProgrammingPage() {
  const [media, setMedia] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOriginalMedia() {
      const token = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      try {
        const res = await fetch(`${apiUrl}/api/media/original`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMedia(data.items || []);
        }
      } catch (e) {
        console.error("Failed to load original programming", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadOriginalMedia();
  }, []);

  return (
    <div className="container max-w-7xl py-10 mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-4 px-2">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            BGC Originals
          </h1>
          <p className="text-muted-foreground mt-2 text-xl">Exclusive community-driven video programming and content.</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-xl border">
          <Tv className="h-5 w-5 text-primary" />
          <span className="font-bold text-sm uppercase tracking-widest">Now Playing</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="text-lg animate-pulse">Broadcasting original content...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {media.map((item) => (
            <Card key={item.id} className="overflow-hidden group hover:ring-4 hover:ring-primary/20 transition-all neo-brutal bg-card">
              <div className="aspect-video bg-muted relative overflow-hidden">
                <img 
                  src={item.url} 
                  alt={item.title || "Original Programming"} 
                  className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                    <Play className="h-8 w-8 text-primary-foreground fill-current ml-1" />
                  </div>
                </div>
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge className="bg-primary/90 backdrop-blur">Featured</Badge>
                  {item.type === "VIDEO" && (
                    <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur border-none">
                      <Video className="h-3 w-3 mr-1" /> HD
                    </Badge>
                  )}
                </div>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl line-clamp-1">{item.title || "Community Highlight"}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {item.description || "Tune in to the latest original content from across the BGC network."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  <span className="uppercase font-bold tracking-tighter text-primary">Free for All Members</span>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {media.length === 0 && (
            <div className="col-span-full py-40 text-center border-4 border-dashed rounded-[2rem] bg-muted/20">
              <Video className="h-20 w-20 mx-auto mb-6 opacity-10 text-primary" />
              <h2 className="text-3xl font-bold text-muted-foreground">Original Programming Coming Soon</h2>
              <p className="text-muted-foreground mt-2">Our content creators are working on something special. Stay tuned!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
