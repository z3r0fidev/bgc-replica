"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, User as UserIcon, Heart, UserPlus } from "lucide-react"
import { toast } from "sonner"

export default function PublicProfilePage() {
  const params = useParams()
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      if (!params.id) return;
      
      setIsLoading(true);
      try {
        const token = localStorage.getItem("access_token")
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
        
        console.log(`DEBUG: Fetching profile from ${apiUrl}/api/profiles/${params.id}`);
        
        const response = await fetch(`${apiUrl}/api/profiles/${params.id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setProfile(data)
        } else {
          console.error(`ERROR: Failed to fetch profile. Status: ${response.status}`);
          setProfile(null);
        }
      } catch (error) {
        console.error("Failed to load profile", error)
        setProfile(null);
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [params.id])

  const handleFavorite = async () => {
    toast.success("Added to favorites!")
  }

  const handleFriendRequest = async () => {
    toast.info("Friend request sent!")
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading profile...</div>
  if (!profile) return <div className="flex items-center justify-center min-h-screen">Profile not found.</div>

  return (
    <div className="container max-w-4xl py-10 space-y-8">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="w-full md:w-1/3 aspect-square bg-muted rounded-xl overflow-hidden shadow-lg border border-black/10">
          <img 
            src={profile.user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}&gender=male`} 
            alt={profile.user?.name || "User"} 
            className="w-full h-full object-cover" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}&gender=male`;
            }}
          />
        </div>
        <div className="flex-1 space-y-4 w-full">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#4C1230]">{profile.user?.name || "Anonymous"}</h1>
              <div className="flex items-center text-muted-foreground mt-1 gap-2">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">{profile.location_city || "Earth"}, {profile.location_state || "Anywhere"}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handleFavorite}>
                <Heart className="h-5 w-5" />
              </Button>
              <Button onClick={handleFriendRequest}>
                <UserPlus className="mr-2 h-5 w-5" />
                Friend
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 py-4 border-y">
            <div className="flex items-center gap-2">
              <span className="font-bold">Height:</span> <span>{profile.height || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">Ethnicity:</span> <span>{profile.ethnicity || "N/A"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-lg">About Me</h3>
            <p className="text-muted-foreground leading-relaxed">
              {profile.bio || "This user hasn't written a bio yet."}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold">Gallery</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Gallery items would go here */}
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-muted-foreground italic">
            Photos Coming Soon
          </div>
        </div>
      </div>
    </div>
  )
}
