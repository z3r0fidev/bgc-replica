"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function ForumsPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      const token = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      try {
        const res = await fetch(`${apiUrl}/api/forums/categories`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadCategories();
  }, []);

  return (
    <div className="container max-w-6xl py-10 mx-auto">
      <div className="mb-10 px-2">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Community Forums</h1>
        <p className="text-muted-foreground mt-2">Engage in deep discussions with the community.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-20">Loading categories...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/forums/${cat.slug}`}>
              <Card className="hover:ring-2 hover:ring-primary transition-all cursor-pointer bg-card">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{cat.name}</CardTitle>
                    <CardDescription>{cat.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
