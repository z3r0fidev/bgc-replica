"use client";

import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ForumThread } from "@/services/forums";
import { ThreadRow } from "./thread-row";

interface ThreadListProps {
  threads: ForumThread[];
  hasNext: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
}

export function ThreadList({ threads, hasNext, onLoadMore, isLoading }: ThreadListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: hasNext ? threads.length + 1 : threads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();

  React.useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem && lastItem.index >= threads.length && hasNext && !isLoading) {
      onLoadMore();
    }
  }, [virtualItems, threads.length, hasNext, isLoading, onLoadMore]);

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar liquid-glass rounded-sm"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const isLoaderRow = virtualRow.index >= threads.length;
          const thread = threads[virtualRow.index];

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
                <div className="p-4 text-center text-[10px] font-black uppercase tracking-widest animate-pulse opacity-40">
                  Syncing threads...
                </div>
              ) : (
                <ThreadRow thread={thread} />
              )}
            </div>
          );
        })}
      </div>

      {threads.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center p-20 text-center">
          <div className="text-sm font-black uppercase tracking-widest opacity-20 italic">
            No discussions found here yet
          </div>
        </div>
      )}
    </div>
  );
}
