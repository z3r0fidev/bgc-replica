"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Users, Image as ImageIcon, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import type { Album } from "@/types/gallery";

interface AlbumCardProps {
  album: Album;
  onEdit?: (album: Album) => void;
  onDelete?: (album: Album) => void;
  onShare?: (album: Album) => void;
}

export function AlbumCard({ album, onEdit, onDelete, onShare }: AlbumCardProps) {
  const getPrivacyIcon = () => {
    switch (album.privacy) {
      case "PRIVATE":
        return <Lock className="h-3 w-3" />;
      case "FRIENDS_ONLY":
        return <Users className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden group cursor-pointer">
        <Link href={`/gallery/albums/${album.id}`}>
          {/* Cover image */}
          <div className="aspect-video bg-muted relative overflow-hidden">
            {album.cover_url ? (
              <Image
                src={album.cover_url}
                alt={album.title}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}

            {/* Privacy badge */}
            {album.privacy !== "PUBLIC" && (
              <Badge
                variant="secondary"
                className="absolute top-2 left-2 text-xs gap-1"
              >
                {getPrivacyIcon()}
                {album.privacy === "PRIVATE" ? "Private" : "Friends"}
              </Badge>
            )}

            {/* Media count */}
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
              {album.media_count} {album.media_count === 1 ? "item" : "items"}
            </div>
          </div>
        </Link>

        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/gallery/albums/${album.id}`} className="flex-1 min-w-0">
              <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                {album.title}
              </h3>
              {album.description && (
                <p className="text-sm text-muted-foreground truncate mt-1">
                  {album.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(album.created_at).toLocaleDateString()}
              </p>
            </Link>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(album)}>
                  Edit album
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onShare?.(album)}>
                  Share album
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete?.(album)}
                >
                  Delete album
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
