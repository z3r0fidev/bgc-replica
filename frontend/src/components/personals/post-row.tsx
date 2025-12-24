"use client";

import React, { useState } from "react";
import Image from "next/image";
import { PersonalPost } from "@/services/personals";
import { FollowButton } from "./follow-button";
import { cn } from "@/lib/utils";
import { CommentThread } from "./comments/CommentThread";

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

export function PersonalPostRow({ post }: { post: PersonalPost }) {
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-4 bg-white border-b border-[#8E8E8E] hover:bg-[#F5F5F5] transition-colors group">
      <div className="flex items-start gap-4">
        <div className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0 overflow-hidden rounded border border-black/10">
          <Image
            src={post.author?.image || "/assets/placeholders/avatar.png"}
            alt={post.author?.name || "User"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-black uppercase leading-tight pr-4 truncate">
              {post.author?.name || "Anonymous"}
            </h3>
            <span className="text-[10px] font-bold text-black/40 uppercase whitespace-nowrap bg-black/5 px-1 rounded">
              Posted: {timeAgo(new Date(post.created_at))} ago
            </span>
          </div>
          
          <div 
            className="text-sm line-clamp-3 text-black/80 font-medium my-2 prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-2">
        <FollowButton 
          postId={post.id} 
          initialFollowing={false} // Would need to check from API if following
          initialCount={post.follow_count} 
        />
        
        <button 
          onClick={() => setShowComments(!showComments)}
          className="group relative flex items-center gap-2 transition-transform active:scale-95"
        >
          <div className="relative w-[120px] h-[40px]">
            <Image
              src="/assets/personals/buttons/commentsBtn.png"
              alt="Comments"
              fill
              className={cn(
                "object-contain transition-all",
                showComments ? "brightness-110" : "grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100"
              )}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-white font-black text-sm drop-shadow-md uppercase tracking-tighter italic">
                COMMENTS
              </span>
            </div>
          </div>
          <span className="font-bold text-sm bg-black/5 px-2 py-1 rounded-md">
            {post.comment_count}
          </span>
        </button>
      </div>

      {showComments && (
        <CommentThread postId={post.id} />
      )}
    </div>
  );
}
