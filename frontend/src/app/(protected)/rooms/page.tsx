"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Hash } from "lucide-react";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRooms() {
      const token = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      try {
        const res = await fetch(`${apiUrl}/api/chat/rooms`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRooms(data.items || []);
        }
      } catch (e) {
        console.error(e);
        setRooms([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadRooms();
  }, []);

  return (
    <div className="container max-w-6xl py-10 mx-auto">
      <div className="flex items-center justify-between mb-10 px-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Chat Rooms</h1>
          <p className="text-muted-foreground mt-2">Join a community and start talking in real-time.</p>
        </div>
        <Button variant="outline">
          <Hash className="mr-2 h-4 w-4" />
          Create Room
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-20">Loading rooms...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(rooms) && rooms.map((room) => (
            <Card key={room.id} className="hover:ring-2 hover:ring-primary transition-all">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary">{room.category}</Badge>
                  <div className="flex items-center text-xs text-muted-foreground gap-1">
                    <Users className="h-3 w-3" />
                    <span>Live</span>
                  </div>
                </div>
                <CardTitle className="text-xl">{room.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {room.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href={`/rooms/${room.id}`}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Join Chat
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {rooms.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl text-muted-foreground">
              No public chat rooms available at the moment.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
