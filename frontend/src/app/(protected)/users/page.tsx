"use client"

import Image from "next/image"
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
  const [results, setResults] = useState<{ id: string; user?: { name?: string; image?: string }; location_city?: string; location_state?: string; age?: number; height?: string; position?: string; ethnicity?: string; privacy_mode?: string }[]>([])
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

  // Calculate active filter count
  const getActiveFilterCount = () => {
    let count = 0
    if (filters.username) count++
    if (filters.location || filters.zipcode || filters.lat) count++
    if (filters.ethnicity !== "ALL") count++
    if (filters.position !== "ALL") count++
    if (filters.build !== "ALL") count++
    if (filters.hiv_status !== "ALL") count++
    if (filters.privacy_mode !== "ALL") count++
    if (filters.trans_interested !== "ALL") count++
    return count
  }

  const loadResults = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

      // Clean up filters for API (remove "ALL" and empty strings)
      const cleanFilters: Record<string, string> = {}
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "ALL" && value !== "" && value !== null) {
          if (key === "trans_interested") {
            cleanFilters[key] = value === "YES" ? "true" : "false"
          } else if (key === "zipcode") {
            cleanFilters["zipcode"] = String(value) // Ensure it matches backend param if added
          } else if (key === "location" && value === "My Current Location") {
            // Don't send the placeholder text to API
          } else {
            cleanFilters[key] = String(value)
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
        toast.success(`Found ${data.items?.length || 0} matches`)
      }
    } catch (error) {
      console.error("Search failed", error)
      setResults([])
      toast.error("Search failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Initial load only
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilters({
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
              })
              toast.success("Filters cleared")
            }}
            disabled={getActiveFilterCount() === 0}
            className="transition-all hover:text-primary disabled:opacity-30"
          >
            Reset
            {getActiveFilterCount() > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">({getActiveFilterCount()})</span>
            )}
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2 border-r pr-6">
          <div className="space-y-6 pb-10">
            {/* Quick Search */}
            <div className="space-y-2 group/filter">
              <label className="text-xs font-bold uppercase text-muted-foreground transition-colors group-focus-within/filter:text-primary">Username</label>
              <Input
                placeholder="Full or partial..."
                value={filters.username}
                onChange={(e) => setFilters({...filters, username: e.target.value})}
                className={`transition-all duration-200 hover:border-primary/50 ${filters.username ? "border-primary/70 bg-primary/5" : ""}`}
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
                    className={`transition-all duration-200 hover:border-primary/50 ${filters.zipcode ? "border-primary/70 bg-primary/5" : ""}`}
                  />
                </div>
                <Select value={filters.miles} onValueChange={(v) => setFilters({...filters, miles: v})}>
                  <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
                    <SelectValue placeholder="Distance" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="animate-in fade-in-0 zoom-in-95 duration-200">
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
                className={`transition-all duration-200 hover:border-primary/50 ${filters.location && filters.location !== "My Current Location" ? "border-primary/70 bg-primary/5" : ""}`}
              />
            </div>

            {/* Identity Dropdowns */}
            <div className="space-y-4 pt-4 border-t">
              <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                Identity & Roles
                <div className="h-px flex-1 bg-border"></div>
              </label>

              <div className="space-y-1 group/filter">
                <span className="text-[10px] text-muted-foreground ml-1 transition-colors group-focus-within/filter:text-primary">Ethnicity</span>
                <Select value={filters.ethnicity} onValueChange={(v) => setFilters({...filters, ethnicity: v})}>
                  <SelectTrigger className={`w-full transition-all duration-200 hover:border-primary/50 ${filters.ethnicity !== "ALL" ? "border-primary/70 bg-primary/5" : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="animate-in fade-in-0 zoom-in-95 duration-200">
                    <SelectItem value="ALL">All Ethnicities</SelectItem>
                    <SelectItem value="Black">Black</SelectItem>
                    <SelectItem value="Latino">Latino/Hispanic</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 group/filter">
                <span className="text-[10px] text-muted-foreground ml-1 transition-colors group-focus-within/filter:text-primary">Position</span>
                <Select value={filters.position} onValueChange={(v) => setFilters({...filters, position: v})}>
                  <SelectTrigger className={`w-full transition-all duration-200 hover:border-primary/50 ${filters.position !== "ALL" ? "border-primary/70 bg-primary/5" : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="animate-in fade-in-0 zoom-in-95 duration-200">
                    <SelectItem value="ALL">All Positions</SelectItem>
                    <SelectItem value="Top">Top</SelectItem>
                    <SelectItem value="Versatile Top">Versatile Top</SelectItem>
                    <SelectItem value="Versatile">Versatile</SelectItem>
                    <SelectItem value="Versatile Bottom">Versatile Bottom</SelectItem>
                    <SelectItem value="Bottom">Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 group/filter">
                <span className="text-[10px] text-muted-foreground ml-1 transition-colors group-focus-within/filter:text-primary">Privacy Mode</span>
                <Select value={filters.privacy_mode} onValueChange={(v) => setFilters({...filters, privacy_mode: v})}>
                  <SelectTrigger className={`w-full transition-all duration-200 hover:border-primary/50 ${filters.privacy_mode !== "ALL" ? "border-primary/70 bg-primary/5" : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="animate-in fade-in-0 zoom-in-95 duration-200">
                    <SelectItem value="ALL">Any Privacy</SelectItem>
                    <SelectItem value="OUT">Out</SelectItem>
                    <SelectItem value="DOWNLO">DownLo (DL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 group/filter">
                <span className="text-[10px] text-muted-foreground ml-1 transition-colors group-focus-within/filter:text-primary">Trans Interested</span>
                <Select value={filters.trans_interested} onValueChange={(v) => setFilters({...filters, trans_interested: v})}>
                  <SelectTrigger className={`w-full transition-all duration-200 hover:border-primary/50 ${filters.trans_interested !== "ALL" ? "border-primary/70 bg-primary/5" : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="animate-in fade-in-0 zoom-in-95 duration-200">
                    <SelectItem value="ALL">Any Interest</SelectItem>
                    <SelectItem value="YES">Yes</SelectItem>
                    <SelectItem value="NO">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Physical Attributes */}
            <div className="space-y-4 pt-4 border-t">
              <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                Physical Attributes
                <div className="h-px flex-1 bg-border"></div>
              </label>

              <div className="space-y-1 group/filter">
                <span className="text-[10px] text-muted-foreground ml-1 transition-colors group-focus-within/filter:text-primary">Build</span>
                <Select value={filters.build} onValueChange={(v) => setFilters({...filters, build: v})}>
                  <SelectTrigger className={`w-full transition-all duration-200 hover:border-primary/50 ${filters.build !== "ALL" ? "border-primary/70 bg-primary/5" : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="animate-in fade-in-0 zoom-in-95 duration-200">
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

              <div className="space-y-1 group/filter">
                <span className="text-[10px] text-muted-foreground ml-1 transition-colors group-focus-within/filter:text-primary">HIV Status</span>
                <Select value={filters.hiv_status} onValueChange={(v) => setFilters({...filters, hiv_status: v})}>
                  <SelectTrigger className={`w-full transition-all duration-200 hover:border-primary/50 ${filters.hiv_status !== "ALL" ? "border-primary/70 bg-primary/5" : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="animate-in fade-in-0 zoom-in-95 duration-200">
                    <SelectItem value="ALL">Any Status</SelectItem>
                    <SelectItem value="Negative">Negative</SelectItem>
                    <SelectItem value="Positive">Positive</SelectItem>
                    <SelectItem value="Ask Me">Ask Me</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full neo-brutal relative overflow-hidden group/btn"
              size="lg"
              onClick={loadResults}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4 transition-transform group-hover/btn:rotate-12" />
                  Apply Filters
                  {getActiveFilterCount() > 0 && (
                    <Badge className="ml-2 bg-primary-foreground text-primary px-1.5 py-0 h-5 text-xs">
                      {getActiveFilterCount()}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-6 min-h-0">
        <div className="flex items-center gap-4 px-2 shrink-0">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors" />
            <Input className="pl-10 h-12 bg-card neo-brutal hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.3)] dark:hover:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.3)] transition-shadow" placeholder="Global search by name or bio..." />
          </div>
          {!isLoading && results.length > 0 && (
            <div className="text-sm text-muted-foreground whitespace-nowrap animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <span className="font-bold text-foreground">{results.length}</span> {results.length === 1 ? 'match' : 'matches'}
            </div>
          )}
        </div>

        <div className="flex-1 px-2 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4 text-muted-foreground animate-in fade-in-0 duration-300">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <div className="animate-ping absolute inset-0 rounded-full h-12 w-12 border border-primary opacity-20"></div>
              </div>
              <span className="font-medium">Searching the community...</span>
              <span className="text-xs">This may take a moment</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-10 animate-in fade-in-0 duration-500">
              {Array.isArray(results) && results.map((profile, index) => (
                <Link key={profile.id} href={`/users/${profile.id}`} style={{ animationDelay: `${index * 50}ms` }} className="animate-in fade-in-0 slide-in-from-bottom-4">
                  <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all duration-300 group neo-brutal hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
                    <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                      <Image
                        src={profile.user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}&gender=male`}
                        alt={profile.user?.name || "Avatar"}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        {...(index < 3 ? { priority: true } : {})}
                      />
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      {/* Online indicator */}
                      <div className="absolute top-2 right-2 transition-transform group-hover:scale-110 duration-300">
                        <Badge className="bg-green-500 hover:bg-green-600 border-none shadow-lg">Online</Badge>
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg truncate">{profile.user?.name || `User ${profile.id.slice(0, 4)}`}</h3>
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
        </div>
      </main>
    </div>
  )
}
