"use client";

import { useState, useEffect, useCallback } from "react";
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
import { AlbumCard } from "@/components/gallery/AlbumCard";
import { AlbumEditor } from "@/components/gallery/AlbumEditor";
import { Plus, Loader2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Album, AlbumPage } from "@/types/gallery";

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Album | null>(null);

  const fetchAlbums = useCallback(async (cursor?: string, reset = false) => {
    try {
      if (reset) setIsLoading(true);

      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (cursor) params.set("cursor", cursor);

      const response = await fetch(`/api/gallery/albums?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch albums");

      const data: AlbumPage = await response.json();

      if (reset) {
        setAlbums(data.items);
      } else {
        setAlbums((prev) => [...prev, ...data.items]);
      }

      setNextCursor(data.next_cursor || null);
    } catch {
      toast.error("Failed to load albums");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlbums(undefined, true);
  }, [fetchAlbums]);

  const handleCreateAlbum = () => {
    setEditingAlbum(null);
    setEditorOpen(true);
  };

  const handleEditAlbum = (album: Album) => {
    setEditingAlbum(album);
    setEditorOpen(true);
  };

  const handleSaveAlbum = (album: Album) => {
    if (editingAlbum) {
      // Update existing
      setAlbums((prev) => prev.map((a) => (a.id === album.id ? album : a)));
    } else {
      // Add new
      setAlbums((prev) => [album, ...prev]);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!deleteTarget) return;

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`/api/gallery/albums/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete album");

      setAlbums((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast.success("Album deleted");
    } catch {
      toast.error("Failed to delete album");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleShareAlbum = async (album: Album) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`/api/gallery/albums/${album.id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expires_in_days: 7 }),
      });

      if (!response.ok) throw new Error("Failed to create share link");

      const data = await response.json();
      const shareUrl = `${window.location.origin}${data.share_url}`;

      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
    } catch {
      toast.error("Failed to create share link");
    }
  };

  return (
    <div className="container max-w-6xl py-10 mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/gallery" className="hover:text-foreground">
              Gallery
            </Link>
            <span>/</span>
            <span>Albums</span>
          </div>
          <h1 className="text-3xl font-bold">My Albums</h1>
          <p className="text-muted-foreground mt-1">
            {albums.length} {albums.length === 1 ? "album" : "albums"}
          </p>
        </div>

        <Button onClick={handleCreateAlbum}>
          <Plus className="h-4 w-4 mr-2" />
          New Album
        </Button>
      </div>

      {isLoading && albums.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : albums.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No albums yet</p>
          <p className="text-muted-foreground mt-1 mb-4">
            Create an album to organize your photos
          </p>
          <Button onClick={handleCreateAlbum}>
            <Plus className="h-4 w-4 mr-2" />
            Create Album
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onEdit={handleEditAlbum}
                onDelete={setDeleteTarget}
                onShare={handleShareAlbum}
              />
            ))}
          </div>

          {nextCursor && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                onClick={() => fetchAlbums(nextCursor)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Load More
              </Button>
            </div>
          )}
        </>
      )}

      {/* Album Editor Dialog */}
      <AlbumEditor
        album={editingAlbum}
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveAlbum}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the album. The photos in this album will not be
              deleted from your gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAlbum}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
