"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CITIES = [
  "Philadelphia", "Allentown", "Reading", "Newark", "Jersey City", 
  "Paterson", "Elizabeth", "Edison", "Woodbridge", "Lakewood",
  "Toms River", "Hamilton", "Trenton", "Camden", "Cherry Hill"
];

interface LocationSelectorProps {
  onCityChange: (city: string) => void;
  selectedCity: string;
}

export function LocationSelector({ onCityChange, selectedCity }: LocationSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-black uppercase tracking-tight text-black/60">Area:</span>
      <Select value={selectedCity} onValueChange={onCityChange}>
        <SelectTrigger className="w-[180px] h-8 bg-white border-black font-bold text-xs uppercase">
          <SelectValue placeholder="All Cities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ALL CITIES</SelectItem>
          {CITIES.map((city) => (
            <SelectItem key={city} value={city}>
              {city.toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
