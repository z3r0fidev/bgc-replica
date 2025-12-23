"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search as SearchIcon, Filter, MapPin, Target, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function SearchPage() {
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLocating, setIsLocating] = useState(false)
  const [filters, setFilters] = useState({
    username: "",
    location: "",
    miles: "50",
    zipcode: "",
    lat: null as number | null,
    lng: null as number | null,
    ethnicity: "ALL",
    position: "ALL",
    build: "ALL",
    hiv_status: "ALL",
    privacy_mode: "ALL",
    trans_interested: "ALL",
  })

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser")
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFilters({
          ...filters,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          zipcode: "", // Clear zipcode if using GPS
          location: "My Current Location",
        })
        setIsLocating(false)
        toast.success("Location acquired!")
      },
      (error) => {
        console.error(error)
        setIsLocating(false)
        toast.error("Failed to get location")
      }
    )
  }

  const loadResults = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      
      // Clean up filters for API (remove "ALL" and empty strings)
      const cleanFilters: any = {}
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "ALL" && value !== "" && value !== null) {
          if (key === "trans_interested") {
            cleanFilters[key] = value === "YES"
          } else if (key === "location" && value === "My Current Location") {
            // Don't send the placeholder text to API
          } else {
            cleanFilters[key] = value
          }
        }
      })

      const queryParams = new URLSearchParams(cleanFilters).toString()
      const response = await fetch(`${apiUrl}/api/search/?${queryParams}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setResults(data.items || [])
      }
    } catch (error) {
      console.error("Search failed", error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadResults()
  }, [])

  return (
    <div className="container py-10 flex flex-col md:flex-row gap-8 h-[calc(100vh-4rem)]">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-80 flex flex-col gap-6 shrink-0">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 font-bold text-2xl">
            <Filter className="h-6 w-6 text-primary" />
            <span>Discovery</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setFilters({
            username: "",
            location: "",
            miles: "50",
            zipcode: "",
            lat: null,
            lng: null,
            ethnicity: "ALL",
            position: "ALL",
            build: "ALL",
            hiv_status: "ALL",
            privacy_mode: "ALL",
            trans_interested: "ALL",
          })}>Reset</Button>
        </div>

        <ScrollArea className="flex-1 px-2 pr-4 border-r pr-6">
          <div className="space-y-6 pb-10">
            {/* Quick Search */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Username</label>
              <Input 
                placeholder="Full or partial..." 
                value={filters.username}
                onChange={(e) => setFilters({...filters, username: e.target.value})}
              />
            </div>

            {/* Geolocation */}
            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase text-muted-foreground">Location & Distance</label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-[10px] gap-1 text-primary"
                  onClick={useMyLocation}
                  disabled={isLocating}
                >
                  {isLocating ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                  Use My Location
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Input 
                    placeholder="Zipcode" 
                    value={filters.zipcode}
                    onChange={(e) => setFilters({...filters, zipcode: e.target.value, lat: null, lng: null})}
                  />
                </div>
                <Select value={filters.miles} onValueChange={(v) => setFilters({...filters, miles: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Distance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="25">25 miles</SelectItem>
                    <SelectItem value="50">50 miles</SelectItem>
                    <SelectItem value="100">100 miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input 
                placeholder="Or Search by City..." 
                value={filters.location}
                onChange={(e) => setFilters({...filters, location: e.target.value, lat: null, lng: null})}
              />
            </div>

            {/* Identity Dropdowns */}
            <div className="space-y-4 pt-2 border-t">
              <label className="text-xs font-bold uppercase text-muted-foreground">Identity & Roles</label>
              
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground ml-1">Ethnicity</span>
                <Select value={filters.ethnicity} onValueChange={(v) => setFilters({...filters, ethnicity: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Ethnicities</SelectItem>
                    <SelectItem value="Black">Black</SelectItem>
                    <SelectItem value="Latino">Latino/Hispanic</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground ml-1">Position</span>
                <Select value={filters.position} onValueChange={(v) => setFilters({...filters, position: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Positions</SelectItem>
                    <SelectItem value="Top">Top</SelectItem>
                    <SelectItem value="Versatile Top">Versatile Top</SelectItem>
                    <SelectItem value="Versatile">Versatile</SelectItem>
                    <SelectItem value="Versatile Bottom">Versatile Bottom</SelectItem>
                    <SelectItem value="Bottom">Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground ml-1">Privacy Mode</span>
                <Select value={filters.privacy_mode} onValueChange={(v) => setFilters({...filters, privacy_mode: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Any Privacy</SelectItem>
                    <SelectItem value="OUT">Out</SelectItem>
                    <SelectItem value="DOWNLO">DownLo (DL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground ml-1">Trans Interested</span>
                <Select value={filters.trans_interested} onValueChange={(v) => setFilters({...filters, trans_interested: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Any Interest</SelectItem>
                    <SelectItem value="YES">Yes</SelectItem>
                    <SelectItem value="NO">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Physical Attributes */}
            <div className="space-y-4 pt-2 border-t">
              <label className="text-xs font-bold uppercase text-muted-foreground">Physical Attributes</label>
              
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground ml-1">Build</span>
                <Select value={filters.build} onValueChange={(v) => setFilters({...filters, build: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Any Build</SelectItem>
                    <SelectItem value="Slim">Slim</SelectItem>
                    <SelectItem value="Slender">Slender</SelectItem>
                    <SelectItem value="Average">Average</SelectItem>
                    <SelectItem value="Athletic">Athletic</SelectItem>
                    <SelectItem value="Muscular">Muscular</SelectItem>
                    <SelectItem value="Large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground ml-1">HIV Status</span>
                <Select value={filters.hiv_status} onValueChange={(v) => setFilters({...filters, hiv_status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Any Status</SelectItem>
                    <SelectItem value="Negative">Negative</SelectItem>
                    <SelectItem value="Positive">Positive</SelectItem>
                    <SelectItem value="Ask Me">Ask Me</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full neo-brutal" size="lg" onClick={loadResults}>
              <Target className="mr-2 h-4 w-4" /> Apply Filters
            </Button>
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="flex items-center gap-4 px-2 shrink-0">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10 h-12 bg-card neo-brutal" placeholder="Global search by name or bio..." />
          </div>
        </div>

        <ScrollArea className="flex-1 px-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span>Searching the community...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
              {Array.isArray(results) && results.map((profile) => (
                <Link key={profile.id} href={`/users/${profile.id}`}>
                  <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all group neo-brutal">
                    <div className="aspect-[3/4] bg-muted relative">
                      {/* Placeholder for primary photo */}
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground italic">
                        No Photo
                      </div>
                      {/* Online indicator */}
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-500 hover:bg-green-600 border-none">Online</Badge>
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg truncate">User {profile.id.slice(0, 8)}</h3>
                        <span className="text-sm font-medium">{profile.height}</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{profile.location_city || "Unknown"}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-[10px]">{profile.ethnicity}</Badge>
                        <Badge variant="outline" className="text-[10px]">{profile.position}</Badge>
                        {profile.privacy_mode === "DOWNLO" && (
                          <Badge variant="destructive" className="text-[10px]">DL</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {Array.isArray(results) && results.length === 0 && (
                <div className="col-span-full py-40 text-center text-muted-foreground border-2 border-dashed rounded-3xl">
                  <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-xl font-bold">No matches found</p>
                  <p>Try broadening your search criteria.</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </main>
    </div>
  )
}
