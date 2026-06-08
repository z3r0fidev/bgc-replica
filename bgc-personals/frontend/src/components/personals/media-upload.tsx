"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, FileImage, Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";
import * as Sentry from "@sentry/nextjs";

interface MediaUploadZoneProps {
  onUploadComplete: (mediaIds: string[]) => void;
  maxFiles?: number;
}

interface UploadingFile {
  id: string;
  file: File;
  preview: string;
  status: "uploading" | "success" | "error";
  progress: number;
  mediaId?: string;
}

export function MediaUploadZone({
  onUploadComplete,
  maxFiles = 5,
}: MediaUploadZoneProps) {
  const [files, setFiles] = useState<UploadingFile[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (files.length + acceptedFiles.length > maxFiles) {
        toast.error(`You can only upload up to ${maxFiles} files.`);
        return;
      }

      const newFiles: UploadingFile[] = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
        status: "uploading",
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      // Upload each file
      for (const uploadingFile of newFiles) {
        try {
          const formData = new FormData();
          formData.append("file", uploadingFile.file);

          const response = await fetch("/api/media/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Upload failed");
          }

          const data = await response.json();
          
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadingFile.id
                ? { ...f, status: "success", mediaId: data.id }
                : f
            )
          );
        } catch (error) {
          Sentry.captureException(error, {
            extra: {
              fileName: uploadingFile.file.name,
              fileType: uploadingFile.file.type,
              fileSize: uploadingFile.file.size,
            },
          });
          toast.error(`Failed to upload ${uploadingFile.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadingFile.id ? { ...f, status: "error" } : f
            )
          );
        }
      }
    },
    [files, maxFiles]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      const successfulMediaIds = filtered
        .filter((f) => f.status === "success" && f.mediaId)
        .map((f) => f.mediaId as string);
      onUploadComplete(successfulMediaIds);
      return filtered;
    });
  };

  // Update parent when any file status changes to success
  React.useEffect(() => {
    const successfulMediaIds = files
      .filter((f) => f.status === "success" && f.mediaId)
      .map((f) => f.mediaId as string);
    onUploadComplete(successfulMediaIds);
  }, [files, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
      "video/*": [".mp4", ".mov", ".webm"],
    },
    maxFiles,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {isDragActive
              ? "Drop the files here"
              : "Drag & drop media here, or click to select"}
          </p>
          <p className="text-xs text-muted-foreground">
            Supports Images and Videos (Max {maxFiles} files)
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
            >
              {file.file.type.startsWith("image/") ? (
                <Image
                  src={file.preview}
                  alt="preview"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Film className="w-8 h-8 text-muted-foreground" />
                </div>
              )}

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {file.status === "uploading" && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}

              {file.status === "error" && (
                <div className="absolute inset-0 bg-destructive/60 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">Error</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
