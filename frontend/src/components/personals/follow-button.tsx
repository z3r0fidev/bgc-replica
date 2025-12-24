"use client";

import React from "react";
import Image from "next/image";
import { useFollow } from "@/hooks/use-follow";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  postId: string;
  initialFollowing: boolean;
  initialCount: number;
  className?: string;
}

export function FollowButton({
  postId,
  initialFollowing,
  initialCount,
  className,
}: FollowButtonProps) {
  const { following, count, toggleFollow, isPending } = useFollow(
    postId,
    initialFollowing,
    initialCount
  );

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFollow();
      }}
      disabled={isPending}
      className={cn(
        "group relative flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50",
        className
      )}
    >
      <div className="relative w-[120px] h-[40px]">
        <Image
          src="/assets/personals/buttons/postFollowBtn.png"
          alt="Follow"
          fill
          className={cn(
            "object-contain transition-all",
            following ? "brightness-110 saturate-150" : "grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100"
          )}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white font-black text-sm drop-shadow-md uppercase tracking-tighter italic">
            {following ? "FOLLOWING" : "FOLLOW"}
          </span>
        </div>
      </div>
      <span className="font-bold text-sm bg-black/5 px-2 py-1 rounded-md">
        {count}
      </span>
    </button>
  );
}
