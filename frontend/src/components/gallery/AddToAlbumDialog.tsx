"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlbumEditor } from "./AlbumEditor";
import { Loader2, Image as ImageIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import type { Album } from "@/types/gallery";

interface AddToAlbumDialogProps {
  mediaIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddToAlbumDialog({
  mediaIds,
  isOpen,
  onClose,
  onSuccess,
}: AddToAlbumDialogProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingAlbumId, setAddingAlbumId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const fetchAlbums = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/gallery/albums?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch albums");

      const data = await response.json();
      setAlbums(data.items);
    } catch {
      toast.error("Failed to load albums");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchAlbums();
  }, [isOpen, fetchAlbums]);

  const addToAlbum = async (album: Album) => {
    setAddingAlbumId(album.id);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`/api/gallery/albums/${album.id}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ media_ids: mediaIds }),
      });

      if (!response.ok) throw new Error("Failed to add media to album");

      const data = await response.json();
      toast.success(
        data.added_count > 0
          ? `Added ${data.added_count} ${data.added_count === 1 ? "item" : "items"} to "${album.title}"`
          : `Already in "${album.title}"`
      );
      onSuccess?.();
      onClose();
    } catch {
      toast.error("Failed to add media to album");
    } finally {
      setAddingAlbumId(null);
    }
  };

  const handleAlbumCreated = (album: Album) => {
    setEditorOpen(false);
    addToAlbum(album);
  };

  return (
    <>
      <Dialog open={isOpen && !editorOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add to Album</DialogTitle>
            <DialogDescription>
              {mediaIds.length} {mediaIds.length === 1 ? "item" : "items"} selected
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[300px] overflow-y-auto -mx-1 px-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : albums.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No albums yet. Create one to get started.
              </div>
            ) : (
              <div className="space-y-1">
                {albums.map((album) => (
                  <button
                    key={album.id}
                    className="w-full flex items-center gap-3 rounded-md p-2 text-left hover:bg-accent disabled:opacity-50"
                    onClick={() => addToAlbum(album)}
                    disabled={addingAlbumId !== null}
                  >
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden relative">
                      {album.cover_url ? (
                        <Image
                          src={album.cover_url}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{album.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {album.media_count} {album.media_count === 1 ? "item" : "items"}
                      </p>
                    </div>
                    {addingAlbumId === album.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorOpen(true)}
              disabled={addingAlbumId !== null}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Album
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested: create a new album, then immediately add the selected media to it */}
      <AlbumEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleAlbumCreated}
      />
    </>
  );
}
