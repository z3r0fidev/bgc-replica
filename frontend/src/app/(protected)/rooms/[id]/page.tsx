"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ChatWindow } from "@/components/chat/chat-window";

export default function RoomDetailPage() {
  const params = useParams();
  const [room, setRoom] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    async function loadRoom() {
      const token = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      try {
        const res = await fetch(`${apiUrl}/api/chat/rooms`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const rooms = await res.json();
          const currentRoom = rooms.find((r: any) => r.id === params.id);
          setRoom(currentRoom);
        }

        const meRes = await fetch(`${apiUrl}/api/auth/me`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (meRes.ok) {
          const me = await meRes.json();
          setCurrentUserId(me.id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadRoom();
  }, [params.id]);

  if (!room) return <div className="p-10 text-center">Loading room...</div>;

  return (
    <div className="container max-w-4xl py-10 mx-auto">
      <ChatWindow 
        roomId={room.id} 
        currentUserId={currentUserId} 
        recipientName={room.name}
      />
    </div>
  );
}
