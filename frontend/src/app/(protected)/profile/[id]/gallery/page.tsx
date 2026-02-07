"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GalleryGrid, MediaLightbox } from "@/components/gallery";
import { Loader2, Image, Film, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { GalleryMedia, GalleryPage } from "@/types/gallery";

type MediaFilter = "ALL" | "IMAGE" | "VIDEO";

export default function UserGalleryPage() {
  const params = useParams();
  const userId = params.id as string;
  const { data: session } = useSession();

  const [items, setItems] = useState<GalleryMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState<MediaFilter>("ALL");

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const isOwner = session?.user?.id === userId;

  const fetchGallery = useCallback(
    async (cursor?: string, reset = false) => {
      try {
        if (reset) setIsLoading(true);

        const token = localStorage.getItem("access_token");
        const params = new URLSearchParams();
        params.set("limit", "30");
        if (cursor) params.set("cursor", cursor);
        if (filter !== "ALL") params.set("type", filter);

        const response = await fetch(`/api/gallery/users/${userId}?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          if (response.status === 404) {
            setItems([]);
            setTotalCount(0);
            return;
          }
          throw new Error("Failed to fetch gallery");
        }

        const data: GalleryPage = await response.json();

        if (reset) {
          setItems(data.items);
        } else {
          setItems((prev) => [...prev, ...data.items]);
        }

        setNextCursor(data.next_cursor || null);
        setTotalCount(data.total_count);
      } catch {
        toast.error("Failed to load gallery");
      } finally {
        setIsLoading(false);
      }
    },
    [userId, filter]
  );

  useEffect(() => {
    fetchGallery(undefined, true);
  }, [fetchGallery]);

  const handleItemClick = (item: GalleryMedia, index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleFilterChange = (value: string) => {
    setFilter(value as MediaFilter);
  };

  return (
    <div className="container max-w-6xl py-10 mx-auto px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link
            href={`/profile/${userId}`}
            className="hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {isOwner ? "My Gallery" : "Gallery"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {totalCount} {totalCount === 1 ? "item" : "items"}
            </p>
          </div>

          {isOwner && (
            <Button asChild>
              <Link href="/gallery">Manage Gallery</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <Tabs value={filter} onValueChange={handleFilterChange}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="IMAGE" className="gap-2">
              {/* eslint-disable-next-line jsx-a11y/alt-text -- This is a Lucide icon, not an img element */}
              <Image className="h-4 w-4" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="VIDEO" className="gap-2">
              <Film className="h-4 w-4" />
              Videos
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Gallery Grid */}
      {isLoading && items.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <p className="text-lg font-medium">No public media</p>
          <p className="text-muted-foreground mt-1">
            {isOwner
              ? "Upload some photos to share with others"
              : "This user hasn't shared any media yet"}
          </p>
          {isOwner && (
            <Button asChild className="mt-4">
              <Link href="/gallery">Go to Gallery</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <GalleryGrid
            items={items}
            onItemClick={handleItemClick}
            onLoadMore={() => nextCursor && fetchGallery(nextCursor)}
            hasMore={!!nextCursor}
            isLoading={isLoading}
            showPrivacyBadge={isOwner}
          />

          {nextCursor && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                onClick={() => fetchGallery(nextCursor)}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Load More
              </Button>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      <MediaLightbox
        items={items}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
