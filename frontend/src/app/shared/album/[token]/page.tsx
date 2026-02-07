"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { GalleryGrid, MediaLightbox } from "@/components/gallery";
import { Badge } from "@/components/ui/badge";
import { Loader2, Share2, Calendar, Image as ImageIcon } from "lucide-react";
import type { AlbumWithMedia, GalleryMedia } from "@/types/gallery";

export default function SharedAlbumPage() {
  const params = useParams();
  const token = params.token as string;

  const [album, setAlbum] = useState<AlbumWithMedia | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    async function fetchSharedAlbum() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/gallery/albums/shared/${token}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("This album link has expired or doesn't exist");
            return;
          }
          throw new Error("Failed to load album");
        }

        const data: AlbumWithMedia = await response.json();
        setAlbum(data);
      } catch {
        setError("Failed to load album");
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      fetchSharedAlbum();
    }
  }, [token]);

  const handleItemClick = (item: GalleryMedia, index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Share2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Album Not Available</h1>
          <p className="text-muted-foreground">
            {error || "This shared album link may have expired or been removed."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container max-w-6xl py-8 mx-auto px-4">
          <Badge variant="secondary" className="mb-4">
            <Share2 className="h-3 w-3 mr-1" />
            Shared Album
          </Badge>

          <h1 className="text-3xl font-bold">{album.title}</h1>

          {album.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl">
              {album.description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <ImageIcon className="h-4 w-4" />
              {album.media_count} {album.media_count === 1 ? "photo" : "photos"}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Created {new Date(album.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="container max-w-6xl py-8 mx-auto px-4">
        {album.media.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-xl">
            <p className="text-lg font-medium">This album is empty</p>
            <p className="text-muted-foreground mt-1">
              No photos have been added to this album yet
            </p>
          </div>
        ) : (
          <GalleryGrid
            items={album.media}
            onItemClick={handleItemClick}
            showPrivacyBadge={false}
          />
        )}
      </div>

      {/* Lightbox */}
      <MediaLightbox
        items={album.media}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
