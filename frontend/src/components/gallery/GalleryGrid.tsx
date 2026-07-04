"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Play, Lock, Users, Eye } from "lucide-react";
import Image from "next/image";
import type { GalleryMedia } from "@/types/gallery";

interface GalleryGridProps {
  items: GalleryMedia[];
  isLoading?: boolean;
  onItemClick?: (item: GalleryMedia, index: number) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  columns?: number;
  showPrivacyBadge?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

const ITEM_SIZE = 200; // Base size for grid items
const GAP = 8;

export function GalleryGrid({
  items,
  isLoading = false,
  onItemClick,
  onLoadMore,
  hasMore = false,
  columns: propColumns,
  showPrivacyBadge = false,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
}: GalleryGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(propColumns || 3);

  // Responsive columns
  useEffect(() => {
    if (propColumns) {
      setColumns(propColumns);
      return;
    }

    const updateColumns = () => {
      const width = parentRef.current?.offsetWidth || window.innerWidth;
      if (width < 480) setColumns(2);
      else if (width < 768) setColumns(3);
      else if (width < 1024) setColumns(4);
      else setColumns(6);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, [propColumns]);

  const rowCount = Math.ceil(items.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount + (hasMore ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_SIZE + GAP,
    overscan: 2,
  });

  // Load more when reaching the end
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    const lastItem = virtualItems[virtualItems.length - 1];

    if (!lastItem || !hasMore || isLoading) return;

    if (lastItem.index >= rowCount - 1) {
      onLoadMore?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowVirtualizer.getVirtualItems(), hasMore, isLoading, rowCount, onLoadMore]);

  const handleItemClick = useCallback(
    (item: GalleryMedia, index: number, e: React.MouseEvent) => {
      if (selectable) {
        e.preventDefault();
        const newSelected = new Set(selectedIds);
        if (newSelected.has(item.id)) {
          newSelected.delete(item.id);
        } else {
          newSelected.add(item.id);
        }
        onSelectionChange?.(newSelected);
      } else {
        onItemClick?.(item, index);
      }
    },
    [selectable, selectedIds, onSelectionChange, onItemClick]
  );

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "PRIVATE":
        return <Lock className="h-3 w-3" />;
      case "FRIENDS_ONLY":
        return <Users className="h-3 w-3" />;
      default:
        return null;
    }
  };

  if (items.length === 0 && !isLoading) {
    return (
      <div className="text-center py-20 border-2 border-dashed rounded-xl">
        <p className="text-muted-foreground">No media yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Upload some photos or videos to get started
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowIndex = virtualRow.index;
          const startIndex = rowIndex * columns;
          const rowItems = items.slice(startIndex, startIndex + columns);

          // Loading row
          if (rowIndex >= rowCount) {
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="flex justify-center items-center"
              >
                <div className="flex gap-2">
                  {[...Array(columns)].map((_, i) => (
                    <Skeleton
                      key={i}
                      className="aspect-square"
                      style={{ width: `${ITEM_SIZE}px`, height: `${ITEM_SIZE}px` }}
                    />
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: `${GAP}px`,
                padding: `0 ${GAP / 2}px`,
              }}
            >
              {rowItems.map((item, colIndex) => {
                const globalIndex = startIndex + colIndex;
                const isSelected = selectedIds.has(item.id);

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: colIndex * 0.05 }}
                    className={`
                      relative aspect-square rounded-lg overflow-hidden cursor-pointer
                      group bg-muted
                      ${isSelected ? "ring-2 ring-primary ring-offset-2" : ""}
                    `}
                    onClick={(e) => handleItemClick(item, globalIndex, e)}
                  >
                    {/* Thumbnail */}
                    <Image
                      src={item.thumbnail_url || item.url}
                      alt={item.filename || "Gallery item"}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />

                    {/* Video indicator */}
                    {item.type === "VIDEO" && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="p-3 rounded-full bg-black/50 text-white">
                          <Play className="h-6 w-6" fill="white" />
                        </div>
                        {item.duration_seconds && (
                          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-xs bg-black/70 text-white rounded">
                            {Math.floor(item.duration_seconds / 60)}:
                            {(item.duration_seconds % 60).toString().padStart(2, "0")}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Privacy badge */}
                    {showPrivacyBadge && item.privacy !== "PUBLIC" && (
                      <Badge
                        variant="secondary"
                        className="absolute top-2 left-2 text-xs gap-1 pointer-events-none"
                      >
                        {getPrivacyIcon(item.privacy)}
                        {item.privacy === "PRIVATE" ? "Private" : "Friends"}
                      </Badge>
                    )}

                    {/* Selection checkbox */}
                    {selectable && (
                      <div
                        className={`
                          absolute top-2 right-2 w-6 h-6 rounded-full border-2
                          flex items-center justify-center transition-colors
                          pointer-events-none
                          ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "bg-white/80 border-muted-foreground/50"
                          }
                        `}
                      >
                        {isSelected && (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M5 13l4 4L19 7"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />

                    {/* View count on hover */}
                    {item.view_count > 0 && (
                      <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <span className="flex items-center gap-1 text-xs text-white bg-black/50 px-2 py-1 rounded">
                          <Eye className="h-3 w-3" />
                          {item.view_count}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
