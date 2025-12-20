"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search as SearchIcon, Filter, MapPin } from "lucide-react"
import Link from "next/link"

export default function SearchPage() {
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    location: "",
    ethnicity: "",
  })

  const loadResults = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const queryParams = new URLSearchParams(filters).toString()
      const response = await fetch(`${apiUrl}/api/search/?${queryParams}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setResults(data)
      }
    } catch (error) {
      console.error("Search failed", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadResults()
  }, [])

  return (
    <div className="container py-10 flex flex-col md:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 space-y-6">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Filter className="h-5 w-5" />
          <span>Filters</span>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Location</label>
            <Input 
              placeholder="City name..." 
              value={filters.location}
              onChange={(e) => setFilters({...filters, location: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ethnicity</label>
            <Input 
              placeholder="e.g. Black" 
              value={filters.ethnicity}
              onChange={(e) => setFilters({...filters, ethnicity: e.target.value})}
            />
          </div>
          <Button className="w-full" onClick={loadResults}>Apply Filters</Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search by name or bio..." />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20">Searching for members...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((profile) => (
              <Link key={profile.id} href={`/users/${profile.id}`}>
                <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all group">
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
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-[10px]">{profile.ethnicity}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {results.length === 0 && (
              <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                No members found matching your criteria.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
