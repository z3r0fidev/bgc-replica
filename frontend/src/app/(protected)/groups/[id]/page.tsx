"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function GroupDetailPage() {
  const params = useParams();
  const [group, setGroup] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadGroup() {
      const token = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      try {
        const res = await fetch(`${apiUrl}/api/groups/`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const groups = await res.json();
          const current = groups.find((g: any) => g.id === params.id);
          setGroup(current);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadGroup();
  }, [params.id]);

  const handleJoin = async () => {
    const token = localStorage.getItem("access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${apiUrl}/api/groups/${params.id}/join`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Welcome to the group!");
      }
    } catch (e) {
      toast.error("Failed to join group");
    }
  };

  if (isLoading) return <div className="p-20 text-center">Loading group details...</div>;
  if (!group) return <div className="p-20 text-center text-muted-foreground">Group not found.</div>;

  return (
    <div className="container max-w-4xl py-10 mx-auto space-y-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b pb-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">{group.name}</h1>
          <p className="text-muted-foreground text-lg">{group.description}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>Members active</span>
            </div>
            <span>•</span>
            <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <Button size="lg" className="px-8 shadow-lg shadow-primary/20" onClick={handleJoin}>
          <UserPlus className="mr-2 h-5 w-5" /> Join Group
        </Button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2 px-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Group Feed</h2>
        </div>
        <div className="text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/10 italic">
          Be the first to post something in {group.name}!
        </div>
      </div>
    </div>
  );
}
