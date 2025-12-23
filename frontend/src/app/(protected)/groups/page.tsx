"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadGroups() {
      const token = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      try {
        const res = await fetch(`${apiUrl}/api/groups/?query=${search}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setGroups(data.items || []);
        }
      } catch (e) {
        console.error(e);
        setGroups([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadGroups();
  }, [search]);

  return (
    <div className="container max-w-6xl py-10 mx-auto">
      <div className="flex items-center justify-between mb-10 px-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Community Groups</h1>
          <p className="text-muted-foreground mt-2">Find and join micro-communities that interest you.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      <div className="relative mb-8 px-2">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          className="pl-10 h-12 bg-card" 
          placeholder="Search groups by name..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-20">Loading groups...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(groups) && groups.map((group) => (
            <Card key={group.id} className="hover:ring-2 hover:ring-primary transition-all">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl">{group.name}</CardTitle>
                  <CardDescription className="line-clamp-1">{group.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="secondary" className="w-full">
                  <Link href={`/groups/${group.id}`}>View Group</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {groups.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl text-muted-foreground">
              No groups found. Why not create one?
            </div>
          )}
        </div>
      )}
    </div>
  );
}
