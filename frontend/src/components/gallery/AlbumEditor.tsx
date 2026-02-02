"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Album, PrivacyLevel } from "@/types/gallery";

interface AlbumEditorProps {
  album?: Album | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (album: Album) => void;
}

export function AlbumEditor({ album, isOpen, onClose, onSave }: AlbumEditorProps) {
  const [title, setTitle] = useState(album?.title || "");
  const [description, setDescription] = useState(album?.description || "");
  const [privacy, setPrivacy] = useState<PrivacyLevel>(album?.privacy || "PUBLIC");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!album;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter an album title");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("access_token");
      const url = isEditing
        ? `/api/gallery/albums/${album.id}`
        : "/api/gallery/albums";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          privacy,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to save album");
      }

      const savedAlbum = await response.json();
      onSave(savedAlbum);
      toast.success(isEditing ? "Album updated" : "Album created");
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save album");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle(album?.title || "");
    setDescription(album?.description || "");
    setPrivacy(album?.privacy || "PUBLIC");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Album" : "Create Album"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your album details"
                : "Create a new album to organize your photos"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Album"
                maxLength={100}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                maxLength={500}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="privacy">Privacy</Label>
              <Select value={privacy} onValueChange={(v) => setPrivacy(v as PrivacyLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public - Anyone can see</SelectItem>
                  <SelectItem value="FRIENDS_ONLY">Friends Only</SelectItem>
                  <SelectItem value="PRIVATE">Private - Only you</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Album"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
