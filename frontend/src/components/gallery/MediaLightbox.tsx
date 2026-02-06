"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { GalleryMedia } from "@/types/gallery";

interface MediaLightboxProps {
  items: GalleryMedia[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (item: GalleryMedia) => void;
  showControls?: boolean;
}

export function MediaLightbox({
  items,
  initialIndex,
  isOpen,
  onClose,
  onDelete,
  showControls = true,
}: MediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentItem = items[currentIndex];
  const hasNext = currentIndex < items.length - 1;
  const hasPrev = currentIndex > 0;

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentIndex(initialIndex);
      setZoom(1);
      setIsPlaying(false);
    }
  }, [isOpen, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (hasPrev) setCurrentIndex((i) => i - 1);
          break;
        case "ArrowRight":
          if (hasNext) setCurrentIndex((i) => i + 1);
          break;
        case "+":
        case "=":
          setZoom((z) => Math.min(z + 0.25, 3));
          break;
        case "-":
          setZoom((z) => Math.max(z - 0.25, 0.5));
          break;
        case "0":
          setZoom(1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hasNext, hasPrev, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleDownload = useCallback(() => {
    if (!currentItem) return;
    const link = document.createElement("a");
    link.href = currentItem.url;
    link.download = currentItem.filename || `media-${currentItem.id}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentItem]);

  const handleShare = useCallback(async () => {
    if (!currentItem) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: currentItem.filename || "Shared media",
          url: currentItem.url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(currentItem.url);
    }
  }, [currentItem]);

  if (!isOpen || !currentItem) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 flex flex-col"
        onClick={onClose}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/70">
              {currentIndex + 1} / {items.length}
            </span>
            {currentItem.filename && (
              <span className="text-sm truncate max-w-[200px]">
                {currentItem.filename}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showControls && (
              <>
                {currentItem.type === "IMAGE" && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/10"
                      onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                    >
                      <ZoomOut className="h-5 w-5" />
                    </Button>
                    <span className="text-sm w-12 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/10"
                      onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                    >
                      <ZoomIn className="h-5 w-5" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                  onClick={handleDownload}
                >
                  <Download className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                  onClick={handleShare}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-destructive/20 hover:text-destructive"
                    onClick={() => onDelete(currentItem)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div
          className="flex-1 flex items-center justify-center relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Previous button */}
          {hasPrev && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 z-10 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={() => setCurrentIndex((i) => i - 1)}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {/* Media content */}
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="max-w-full max-h-full"
            style={{
              transform: `scale(${zoom})`,
              transition: "transform 0.2s ease",
            }}
          >
            {currentItem.type === "IMAGE" ? (
              // eslint-disable-next-line @next/next/no-img-element -- External URL from user uploads
              <img
                src={currentItem.url}
                alt={currentItem.filename || "Gallery image"}
                className="max-w-[90vw] max-h-[80vh] object-contain"
                draggable={false}
              />
            ) : (
              <div className="relative">
                <video
                  src={currentItem.url}
                  className="max-w-[90vw] max-h-[80vh]"
                  controls
                  autoPlay={isPlaying}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            )}
          </motion.div>

          {/* Next button */}
          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 z-10 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={() => setCurrentIndex((i) => i + 1)}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}
        </div>

        {/* Thumbnail strip */}
        {items.length > 1 && (
          <div
            className="p-4 overflow-x-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2 justify-center">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  className={`
                    w-16 h-16 rounded overflow-hidden flex-shrink-0 transition-all
                    ${
                      index === currentIndex
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-black"
                        : "opacity-50 hover:opacity-100"
                    }
                  `}
                  onClick={() => setCurrentIndex(index)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- External URL from user uploads */}
                  <img
                    src={item.thumbnail_url || item.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Keyboard hints */}
        <div className="absolute bottom-4 left-4 text-xs text-white/50 hidden md:block">
          ← → Navigate • +/- Zoom • Esc Close
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
