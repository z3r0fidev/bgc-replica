"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MediaUploader, GalleryGrid, MediaLightbox } from "@/components/gallery";
import { Plus, Trash2, FolderPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { GalleryMedia, GalleryPage as GalleryPageType } from "@/types/gallery";

export default function GalleryPage() {
  const [media, setMedia] = useState<GalleryMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState("gallery");
  const [typeFilter, setTypeFilter] = useState<"all" | "IMAGE" | "VIDEO">("all");

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<GalleryMedia | null>(null);
  const [isBulkDelete, setIsBulkDelete] = useState(false);

  const fetchMedia = useCallback(async (cursor?: string, reset = false) => {
    try {
      if (reset) setIsLoading(true);

      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams();
      params.set("limit", "30");
      if (cursor) params.set("cursor", cursor);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const response = await fetch(`/api/gallery/?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch gallery");

      const data: GalleryPageType = await response.json();

      if (reset) {
        setMedia(data.items);
      } else {
        setMedia((prev) => [...prev, ...data.items]);
      }

      setNextCursor(data.next_cursor || null);
      setTotalCount(data.total_count);
    } catch (error) {
      toast.error("Failed to load gallery");
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchMedia(undefined, true);
  }, [fetchMedia]);

  const handleUploadComplete = (newMedia: GalleryMedia) => {
    setMedia((prev) => [newMedia, ...prev]);
    setTotalCount((prev) => prev + 1);
  };

  const handleItemClick = (item: GalleryMedia, index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleDelete = async (item: GalleryMedia) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`/api/gallery/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Delete failed");

      setMedia((prev) => prev.filter((m) => m.id !== item.id));
      setTotalCount((prev) => prev - 1);
      setDeleteTarget(null);
      setLightboxOpen(false);
      toast.success("Media deleted");
    } catch (error) {
      toast.error("Failed to delete media");
    }
  };

  const handleBulkDelete = async () => {
    try {
      const token = localStorage.getItem("access_token");

      // Delete each selected item
      const deletePromises = Array.from(selectedIds).map((id) =>
        fetch(`/api/gallery/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      await Promise.all(deletePromises);

      setMedia((prev) => prev.filter((m) => !selectedIds.has(m.id)));
      setTotalCount((prev) => prev - selectedIds.size);
      setSelectedIds(new Set());
      setSelectionMode(false);
      setIsBulkDelete(false);
      toast.success(`${selectedIds.size} items deleted`);
    } catch (error) {
      toast.error("Failed to delete some items");
    }
  };

  const handleLoadMore = () => {
    if (nextCursor && !isLoading) {
      fetchMedia(nextCursor);
    }
  };

  return (
    <div className="container max-w-6xl py-10 mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Gallery</h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} {totalCount === 1 ? "item" : "items"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedIds(new Set());
                }}
              >
                Cancel
              </Button>
              {selectedIds.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // TODO: Add to album dialog
                      toast.info("Add to album coming soon");
                    }}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Add to Album
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setIsBulkDelete(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedIds.size})
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setSelectionMode(true)}>
                Select
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="upload">
            <Plus className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="space-y-4">
          {/* Type filter */}
          <div className="flex gap-2">
            <Button
              variant={typeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("all")}
            >
              All
            </Button>
            <Button
              variant={typeFilter === "IMAGE" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("IMAGE")}
            >
              Photos
            </Button>
            <Button
              variant={typeFilter === "VIDEO" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("VIDEO")}
            >
              Videos
            </Button>
          </div>

          {isLoading && media.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <GalleryGrid
              items={media}
              isLoading={isLoading}
              onItemClick={handleItemClick}
              onLoadMore={handleLoadMore}
              hasMore={!!nextCursor}
              showPrivacyBadge
              selectable={selectionMode}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          )}
        </TabsContent>

        <TabsContent value="upload">
          <MediaUploader
            onUploadComplete={handleUploadComplete}
            maxFiles={10}
          />
        </TabsContent>
      </Tabs>

      {/* Lightbox */}
      <MediaLightbox
        items={media}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onDelete={(item) => setDeleteTarget(item)}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete media?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the media
              from your gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={isBulkDelete} onOpenChange={setIsBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              selected media from your gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
