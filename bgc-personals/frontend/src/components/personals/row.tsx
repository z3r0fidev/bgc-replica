import React from "react";
import Image from "next/image";
import { Profile } from "@/types/profile";

function timeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m";
  return Math.floor(seconds) + "s";
}

export function PersonalListingRow({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white border-b border-[#8E8E8E] hover:bg-[#F5F5F5] transition-colors cursor-pointer group">
      <div className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0 overflow-hidden rounded border border-black/10">
        <Image
          src={profile.user?.image || "/assets/placeholders/avatar.png"}
          alt={profile.user?.name || "User"}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-black uppercase leading-tight pr-4 truncate">
            {profile.user?.name}
          </h3>
          <span className="text-[10px] font-bold text-black/40 uppercase whitespace-nowrap bg-black/5 px-1 rounded">
            Posted: {timeAgo(new Date(profile.last_active))} ago
          </span>
        </div>
        
        <div className="text-xs font-bold text-[#4C1230]/60 uppercase mb-1">
          {profile.location_city}, {profile.location_state} | {profile.height} | {profile.weight} lbs
        </div>
        
        <p className="text-sm line-clamp-2 text-black/80 font-medium">
          {profile.bio?.replace(/[*#]/g, '').slice(0, 150)}...
        </p>
      </div>
    </div>
  );
}
