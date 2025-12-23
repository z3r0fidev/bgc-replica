"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Heart, Users } from "lucide-react"

export default function ConnectionsPage() {
  const [relationships, setRelationships] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadRelationships() {
      try {
        const token = localStorage.getItem("access_token")
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const response = await fetch(`${apiUrl}/api/social/relationships`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setRelationships(data.items || [])
        }
      } catch (error) {
        console.error("Failed to load connections", error)
        setRelationships([])
      } finally {
        setIsLoading(false)
      }
    }
    loadRelationships()
  }, [])

  const friends = Array.isArray(relationships) ? relationships.filter(r => r.type === "FRIEND" && r.status === "ACCEPTED") : []
  const favorites = Array.isArray(relationships) ? relationships.filter(r => r.type === "FAVORITE") : []
  const pending = Array.isArray(relationships) ? relationships.filter(r => r.type === "FRIEND" && r.status === "PENDING") : []

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-8">My Connections</h1>
      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
          <TabsTrigger value="favorites">Favorites ({favorites.length})</TabsTrigger>
          <TabsTrigger value="pending">Requests ({pending.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="friends">
          <div className="grid gap-4">
            {friends.length === 0 && <p className="text-center py-10 text-muted-foreground">No friends yet. Start connecting!</p>}
            {friends.map(friend => (
              <Card key={friend.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold">User {friend.to_user_id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">Added {new Date(friend.created_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="favorites">
          <div className="grid gap-4">
            {favorites.length === 0 && <p className="text-center py-10 text-muted-foreground">Your favorites list is empty.</p>}
            {favorites.map(fav => (
              <Card key={fav.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-red-500">
                    <Heart className="h-6 w-6 fill-current" />
                  </div>
                  <div>
                    <p className="font-bold">User {fav.to_user_id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">Favorited {new Date(fav.created_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="pending">
          {/* Pending requests UI */}
          <p className="text-center py-10 text-muted-foreground">No pending requests.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
