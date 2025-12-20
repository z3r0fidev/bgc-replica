"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Heart, Share2 } from "lucide-react";
import { motion } from "framer-motion";

interface FeedItemProps {
  post: any;
  style?: React.CSSProperties;
}

export function FeedItem({ post, style }: FeedItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={style}
      className="py-2"
    >
      <Card className="hover:bg-muted/5 transition-colors border-primary/5 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-4 p-4">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {post.author_id.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <p className="font-bold text-sm">User {post.author_id.slice(0, 8)}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(post.created_at).toLocaleString()}
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-2">
          <p className="text-base leading-relaxed">{post.content}</p>
          {post.image_url && (
            <img
              src={post.image_url}
              alt="Attachment"
              className="mt-4 rounded-xl border w-full max-h-96 object-cover"
            />
          )}
        </CardContent>
        <CardFooter className="flex gap-4 p-4 border-t mt-4">
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">
            <Heart className="mr-2 h-4 w-4" /> Like
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">
            <MessageSquare className="mr-2 h-4 w-4" /> Comment
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground ml-auto">
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
