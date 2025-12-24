"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { personalsService } from "@/services/personals";
import { VirtualizedListingView } from "@/components/personals/list";
import { LocationSelector } from "@/components/personals/location-filter";
import { Profile } from "@/types/profile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CategoryPage() {
  const params = useParams();
  const category = params.category as string;
  
  const [items, setItems] = useState<Profile[]>([]);
  const [hasNext, setHasNext] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [city, setCity] = useState("all");
  const [position, setPosition] = useState("all");

  const fetchListings = useCallback(async (isInitial = false) => {
    if (isLoading && !isInitial) return;
    setIsLoading(true);
    
    try {
      const response = await personalsService.getListings({
        category,
        city: city === "all" ? undefined : city,
        cursor: isInitial ? undefined : cursor,
        limit: 20
      });
      
      setItems(prev => isInitial ? response.items : [...prev, ...response.items]);
      setHasNext(response.metadata.has_next);
      setCursor(response.metadata.next_cursor);
    } catch (error) {
      console.error("Failed to fetch listings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [category, cursor, isLoading, city]);

  useEffect(() => {
    fetchListings(true);
  }, [category, city]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-black pb-4">
        <h2 className="text-2xl font-black uppercase tracking-tight">
          Recent Listings: {category.replace("-", " ")}
        </h2>
        
        <div className="flex flex-wrap items-center gap-4">
          <LocationSelector 
            selectedCity={city} 
            onCityChange={(val) => setCity(val)} 
          />
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-tight text-black/60">Position:</span>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger className="w-[120px] h-8 bg-white border-black font-bold text-xs uppercase">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ANY</SelectItem>
                <SelectItem value="top">TOP</SelectItem>
                <SelectItem value="bottom">BOTTOM</SelectItem>
                <SelectItem value="versatile">VERSATILE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <VirtualizedListingView
        items={items}
        hasNext={hasNext}
        isLoading={isLoading}
        onLoadMore={() => fetchListings(false)}
      />
    </div>
  );
}
