"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Film,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { UploadProgress, PrivacyLevel, GalleryMedia } from "@/types/gallery";

interface MediaUploaderProps {
  onUploadComplete?: (media: GalleryMedia) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  acceptedTypes?: string;
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export function MediaUploader({
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  acceptedTypes = ACCEPTED_TYPES,
}: MediaUploaderProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [privacy, setPrivacy] = useState<PrivacyLevel>("PUBLIC");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    if (!acceptedTypes.includes(file.type)) {
      return `Unsupported file type: ${file.type}`;
    }

    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      return `File too large. Maximum size: ${maxMB}MB`;
    }

    return null;
  };

  const uploadFile = async (file: File, uploadId: string) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Update status to uploading
      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId ? { ...u, status: "uploading" as const, progress: 0 } : u
        )
      );

      const token = localStorage.getItem("access_token");
      const response = await fetch(`/api/gallery/upload?privacy=${privacy}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Upload failed");
      }

      const media: GalleryMedia = await response.json();

      // Update to complete
      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId
            ? { ...u, status: "complete" as const, progress: 100, result: media }
            : u
        )
      );

      onUploadComplete?.(media);
      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Upload failed";
      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId ? { ...u, status: "error" as const, error: errorMsg } : u
        )
      );
      onUploadError?.(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, maxFiles - uploads.length);

      fileArray.forEach((file) => {
        const error = validateFile(file);
        const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        if (error) {
          setUploads((prev) => [
            ...prev,
            {
              id: uploadId,
              filename: file.name,
              progress: 0,
              status: "error",
              error,
            },
          ]);
          toast.error(error);
          return;
        }

        setUploads((prev) => [
          ...prev,
          {
            id: uploadId,
            filename: file.name,
            progress: 0,
            status: "pending",
          },
        ]);

        uploadFile(file, uploadId);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uploads.length, maxFiles, privacy]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const clearCompleted = () => {
    setUploads((prev) => prev.filter((u) => u.status !== "complete"));
  };

  return (
    <div className="space-y-4">
      {/* Privacy selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Upload as:</span>
        <Select value={privacy} onValueChange={(v) => setPrivacy(v as PrivacyLevel)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PUBLIC">Public</SelectItem>
            <SelectItem value="FRIENDS_ONLY">Friends Only</SelectItem>
            <SelectItem value="PRIVATE">Private</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Drop zone */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <motion.div
            animate={{ scale: isDragging ? 1.1 : 1 }}
            className="p-4 rounded-full bg-primary/10 mb-4"
          >
            <Upload className="h-8 w-8 text-primary" />
          </motion.div>
          <p className="text-lg font-medium mb-1">
            {isDragging ? "Drop files here" : "Drag & drop files"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            or click to browse
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ImageIcon className="h-3 w-3" /> Images up to 10MB
            </span>
            <span className="flex items-center gap-1">
              <Film className="h-3 w-3" /> Videos up to 100MB
            </span>
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes}
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {/* Upload list */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                Uploads ({uploads.filter((u) => u.status === "complete").length}/
                {uploads.length})
              </span>
              {uploads.some((u) => u.status === "complete") && (
                <Button variant="ghost" size="sm" onClick={clearCompleted}>
                  Clear completed
                </Button>
              )}
            </div>

            {uploads.map((upload) => (
              <motion.div
                key={upload.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                {/* Status icon */}
                {upload.status === "uploading" && (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                )}
                {upload.status === "complete" && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {upload.status === "error" && (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                {upload.status === "pending" && (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                )}

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{upload.filename}</p>
                  {upload.error && (
                    <p className="text-xs text-destructive">{upload.error}</p>
                  )}
                  {upload.status === "uploading" && (
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeUpload(upload.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
