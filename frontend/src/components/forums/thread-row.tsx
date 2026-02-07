import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ForumThread } from "@/services/forums";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ThreadRowProps {
  thread: ForumThread;
}

export function ThreadRow({ thread }: ThreadRowProps) {
  const isHot = thread.stats.replies > 50 || thread.stats.views > 500;

  return (
    <div className="flex items-center gap-3 p-2 bg-white/40 hover:bg-white/60 border-b border-black/5 transition-all cursor-pointer group">
      {/* Status Icon */}
      <div className="w-6 h-6 flex-shrink-0 relative opacity-60 group-hover:opacity-100 transition-opacity">
        {thread.is_sticky ? (
          <Image src="/assets/forums/icons/sticky.svg" alt="Sticky" fill />
        ) : isHot ? (
          <Image src="/assets/forums/icons/hot.svg" alt="Hot" fill />
        ) : (
          <Image src="/assets/forums/icons/unread.svg" alt="Unread" fill />
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <Link href={`/forums/threads/${thread.id}`} className="block">
          <h3 className="text-sm font-bold uppercase tracking-tight truncate leading-tight group-hover:text-[#4C1230]">
            {thread.title}
          </h3>
          <div className="text-[10px] font-bold text-black/40 uppercase">
            Started by <span className="text-black/60">{thread.author.name}</span>
          </div>
        </Link>
      </div>

      {/* Stats */}
      <div className="hidden md:flex flex-col items-end w-20 flex-shrink-0 text-[10px] font-black uppercase tracking-tighter opacity-40">
        <div>{thread.stats.replies} Replies</div>
        <div>{thread.stats.views} Views</div>
      </div>

      {/* Last Post */}
      <div className="flex items-center gap-3 w-[140px] md:w-[180px] flex-shrink-0 text-right">
        <div className="hidden sm:flex flex-col flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase truncate leading-none">
            {thread.last_post.user.name}
          </div>
          <div className="text-[9px] font-bold text-black/40 uppercase leading-none mt-1">
            {new Date(thread.last_post.created_at).toLocaleDateString()}
          </div>
        </div>
        <Avatar className="h-8 w-8 ring-1 ring-black/10">
          <AvatarImage src={thread.last_post.user.avatar} />
          <AvatarFallback className="text-[10px] font-bold bg-black text-white">
            {thread.last_post.user.name[0]}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
