"use client";

import React, { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Profile } from "@/types/profile";
import { PersonalListingRow } from "./row";

interface VirtualizedListingViewProps {
  items: Profile[];
  hasNext: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
}

export function VirtualizedListingView({
  items,
  hasNext,
  onLoadMore,
  isLoading,
}: VirtualizedListingViewProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: hasNext ? items.length + 1 : items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated row height
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  React.useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem && lastItem.index >= items.length && hasNext && !isLoading) {
      onLoadMore();
    }
  }, [virtualItems, items.length, hasNext, isLoading, onLoadMore]);

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-250px)] overflow-auto bg-white border border-[#8E8E8E] rounded-sm"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const isLoaderRow = virtualRow.index >= items.length;
          const profile = items[virtualRow.index];

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
            >
              {isLoaderRow ? (
                <div className="flex items-center justify-center p-8 italic text-black/40 font-bold uppercase animate-pulse">
                  Loading more...
                </div>
              ) : (
                <PersonalListingRow profile={profile} />
              )}
            </div>
          );
        })}
      </div>
      
      {items.length === 0 && !isLoading && (
        <div className="p-12 text-center text-black/40 font-bold uppercase italic">
          No listings found in this category
        </div>
      )}
    </div>
  );
}
