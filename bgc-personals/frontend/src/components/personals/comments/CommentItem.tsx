"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Comment } from "@/hooks/use-comments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CommentItemProps {
  comment: Comment;
  onReply: (content: string, parentId: string) => void;
  replies?: Comment[];
}

export function CommentItem({ comment, onReply, replies = [] }: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const handleReplySubmit = () => {
    if (!replyContent.trim()) return;
    onReply(replyContent, comment.id);
    setReplyContent("");
    setIsReplying(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border">
          <Image
            src={comment.author?.image || "/assets/placeholders/avatar.png"}
            alt={comment.author?.name || "User"}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1">
          <div className="bg-muted p-3 rounded-2xl rounded-tl-none">
            <p className="text-xs font-black uppercase text-primary mb-1">
              {comment.author?.name || "Anonymous"}
            </p>
            <p className="text-sm text-foreground/90">{comment.content}</p>
          </div>
          <div className="flex items-center gap-4 mt-1 ml-2">
            <span className="text-[10px] text-muted-foreground font-bold uppercase">
              {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="text-[10px] text-primary font-black uppercase hover:underline"
            >
              Reply
            </button>
          </div>

          {isReplying && (
            <div className="mt-2 space-y-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="text-sm min-h-[60px]"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setIsReplying(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleReplySubmit}>
                  Post Reply
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <div className="ml-11 space-y-4 border-l-2 border-muted pl-4">
          {replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}
