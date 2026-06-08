"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GalleryGrid, MediaLightbox, SortableAlbumGrid, ShareDialog } from "@/components/gallery";
import { AlbumEditor } from "@/components/gallery/AlbumEditor";
import {
  Loader2,
  Lock,
  Users,
  Share2,
  Edit,
  Trash2,
  Plus,
  Check,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Album, AlbumWithMedia, GalleryMedia, GalleryPage } from "@/types/gallery";

export default function AlbumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const albumId = params.id as string;

  const [album, setAlbum] = useState<AlbumWithMedia | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);

  // Delete state
  const [deleteAlbumOpen, setDeleteAlbumOpen] = useState(false);
  const [removeMediaTarget, setRemoveMediaTarget] = useState<GalleryMedia | null>(null);

  // Add media state
  const [addMediaOpen, setAddMediaOpen] = useState(false);
  const [availableMedia, setAvailableMedia] = useState<GalleryMedia[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [isAddingMedia, setIsAddingMedia] = useState(false);

  // Reorder state
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Share state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const fetchAlbum = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("access_token");

      const response = await fetch(`/api/gallery/albums/${albumId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          router.push("/gallery/albums");
          return;
        }
        throw new Error("Failed to fetch album");
      }

      const data: AlbumWithMedia = await response.json();
      setAlbum(data);
    } catch {
      toast.error("Failed to load album");
    } finally {
      setIsLoading(false);
    }
  }, [albumId, router]);

  useEffect(() => {
    fetchAlbum();
  }, [fetchAlbum]);

  const fetchAvailableMedia = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/gallery/?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch media");

      const data: GalleryPage = await response.json();
      // Filter out media already in album
      const albumMediaIds = new Set(album?.media.map((m) => m.id) || []);
      setAvailableMedia(data.items.filter((m) => !albumMediaIds.has(m.id)));
    } catch {
      toast.error("Failed to load media");
    }
  };

  const handleOpenAddMedia = () => {
    fetchAvailableMedia();
    setSelectedToAdd(new Set());
    setAddMediaOpen(true);
  };

  const handleAddMedia = async () => {
    if (selectedToAdd.size === 0) return;

    setIsAddingMedia(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`/api/gallery/albums/${albumId}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ media_ids: Array.from(selectedToAdd) }),
      });

      if (!response.ok) throw new Error("Failed to add media");

      toast.success(`Added ${selectedToAdd.size} items to album`);
      setAddMediaOpen(false);
      fetchAlbum(); // Refresh album
    } catch {
      toast.error("Failed to add media");
    } finally {
      setIsAddingMedia(false);
    }
  };

  const handleRemoveMedia = async () => {
    if (!removeMediaTarget) return;

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `/api/gallery/albums/${albumId}/media/${removeMediaTarget.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to remove media");

      setAlbum((prev) =>
        prev
          ? {
              ...prev,
              media: prev.media.filter((m) => m.id !== removeMediaTarget.id),
              media_count: prev.media_count - 1,
            }
          : null
      );
      toast.success("Removed from album");
    } catch {
      toast.error("Failed to remove media");
    } finally {
      setRemoveMediaTarget(null);
    }
  };

  const handleDeleteAlbum = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`/api/gallery/albums/${albumId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete album");

      toast.success("Album deleted");
      router.push("/gallery/albums");
    } catch {
      toast.error("Failed to delete album");
    }
  };

  const handleSaveAlbum = (updated: Album) => {
    setAlbum((prev) => (prev ? { ...prev, ...updated } : null));
  };

  const handleReorder = async (newItems: GalleryMedia[]) => {
    if (!album) return;

    // Optimistically update local state - add position to items
    const itemsWithPosition = newItems.map((item, index) => ({
      ...item,
      position: index,
    }));
    setAlbum((prev) =>
      prev ? { ...prev, media: itemsWithPosition } : null
    );

    // Save to server
    setIsSavingOrder(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`/api/gallery/albums/${albumId}/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          media_ids: newItems.map((item) => item.id),
        }),
      });

      if (!response.ok) throw new Error("Failed to save order");

      toast.success("Order saved");
    } catch {
      // Revert on failure
      fetchAlbum();
      toast.error("Failed to save order");
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleItemClick = (item: GalleryMedia, index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-10 mx-auto px-4">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!album) {
    return null;
  }

  const getPrivacyBadge = () => {
    switch (album.privacy) {
      case "PRIVATE":
        return (
          <Badge variant="secondary" className="gap-1">
            <Lock className="h-3 w-3" /> Private
          </Badge>
        );
      case "FRIENDS_ONLY":
        return (
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" /> Friends Only
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container max-w-6xl py-10 mx-auto px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/gallery" className="hover:text-foreground">
            Gallery
          </Link>
          <span>/</span>
          <Link href="/gallery/albums" className="hover:text-foreground">
            Albums
          </Link>
          <span>/</span>
          <span className="text-foreground">{album.title}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{album.title}</h1>
              {getPrivacyBadge()}
            </div>
            {album.description && (
              <p className="text-muted-foreground mt-2">{album.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {album.media_count} {album.media_count === 1 ? "item" : "items"} •
              Created {new Date(album.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenAddMedia}>
              <Plus className="h-4 w-4 mr-2" />
              Add Photos
            </Button>
            <Button
              variant={isReorderMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsReorderMode(!isReorderMode)}
              disabled={album.media.length < 2}
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {isReorderMode ? "Done" : "Reorder"}
              {isSavingOrder && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteAlbumOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      {album.media.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <p className="text-lg font-medium">This album is empty</p>
          <p className="text-muted-foreground mt-1 mb-4">
            Add some photos to get started
          </p>
          <Button onClick={handleOpenAddMedia}>
            <Plus className="h-4 w-4 mr-2" />
            Add Photos
          </Button>
        </div>
      ) : isReorderMode ? (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop photos to reorder them
          </p>
          <SortableAlbumGrid
            items={album.media}
            onReorder={handleReorder}
            onItemClick={handleItemClick}
            showPrivacyBadge={false}
          />
        </div>
      ) : (
        <GalleryGrid
          items={album.media}
          onItemClick={handleItemClick}
          showPrivacyBadge={false}
        />
      )}

      {/* Lightbox */}
      <MediaLightbox
        items={album.media}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onDelete={(item) => setRemoveMediaTarget(item)}
      />

      {/* Album Editor */}
      <AlbumEditor
        album={album}
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveAlbum}
      />

      {/* Share Dialog */}
      <ShareDialog
        albumId={albumId}
        albumTitle={album.title}
        isOpen={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
      />

      {/* Add Media Dialog */}
      <Dialog open={addMediaOpen} onOpenChange={setAddMediaOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Photos to Album</DialogTitle>
            <DialogDescription>
              Select photos from your gallery to add to this album
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-4">
            {availableMedia.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No more photos available to add
              </div>
            ) : (
              <GalleryGrid
                items={availableMedia}
                selectable
                selectedIds={selectedToAdd}
                onSelectionChange={setSelectedToAdd}
              />
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              {selectedToAdd.size} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddMediaOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddMedia}
                disabled={selectedToAdd.size === 0 || isAddingMedia}
              >
                {isAddingMedia ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Add {selectedToAdd.size > 0 ? `(${selectedToAdd.size})` : ""}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Media Confirmation */}
      <AlertDialog
        open={!!removeMediaTarget}
        onOpenChange={() => setRemoveMediaTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from album?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the photo from this album. The photo will still be
              in your gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMedia}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Album Confirmation */}
      <AlertDialog open={deleteAlbumOpen} onOpenChange={setDeleteAlbumOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{album.title}"?</AlertDialogTitle>
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
              Delete Album
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
