"use client";

import React, { useState } from "react";
import { useComments } from "@/hooks/use-comments";
import { CommentItem } from "./CommentItem";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";

interface CommentThreadProps {
  postId: string;
}

export function CommentThread({ postId }: CommentThreadProps) {
  const { comments, isLoading, addComment } = useComments(postId);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    await addComment(newComment);
    setNewComment("");
    setIsSubmitting(false);
  };

  // Organize comments into threads (max 2 levels per spec)
  const rootComments = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  return (
    <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 pb-2 border-b">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-black uppercase tracking-tight">
          Discussion ({comments.length})
        </h4>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : rootComments.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground italic py-4">
            No comments yet. Be the first to start the conversation!
          </p>
        ) : (
          rootComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={addComment}
              replies={getReplies(comment.id)}
            />
          ))
        )}
      </div>

      <div className="space-y-2 pt-4 border-t">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Leave a comment..."
          className="min-h-[80px] bg-muted/50 focus:bg-background transition-colors"
        />
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !newComment.trim()}
            className="font-bold uppercase tracking-tight"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
