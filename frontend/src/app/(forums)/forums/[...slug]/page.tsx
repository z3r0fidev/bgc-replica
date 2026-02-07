"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { forumsService, ForumThread, ForumCategoryTree } from "@/services/forums";
import { ThreadList } from "@/components/forums/thread-list";
import { ForumBreadcrumbs } from "@/components/forums/breadcrumbs";
import { ForumStats } from "@/components/forums/stats";
import { CreateThreadFAB } from "@/components/forums/create-thread-fab";

export default function ForumPage() {
  const params = useParams();
  const slugs = params.slug as string[];
  const currentSlug = slugs ? slugs[slugs.length - 1] : "";

  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [activeCategory, setActiveCategory] = useState<ForumCategoryTree | null>(null);
  const [hasNext, setHasNext] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isLoading && !isInitial) return;
    setIsLoading(true);

    try {
      // 1. Get Tree to find Category ID for stats
      const tree = await forumsService.getTree();
      const findInTree = (nodes: ForumCategoryTree[]): ForumCategoryTree | null => {
        for (const node of nodes) {
          if (node.slug === currentSlug) return node;
          if (node.children) {
            const found = findInTree(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      const cat = findInTree(tree);
      setActiveCategory(cat);

      // 2. Fetch Threads
      const response = await forumsService.getThreads(currentSlug, {
        cursor: isInitial ? undefined : cursor,
        limit: 20
      });

      setThreads(prev => isInitial ? response.items : [...prev, ...response.items]);
      setHasNext(response.has_more);
      setCursor(response.next_cursor ?? undefined);
    } catch (error) {
      console.error("Failed to fetch forum data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentSlug, cursor, isLoading]);

  useEffect(() => {
    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlug]);

  return (
    <div className="flex flex-col gap-4">
      <ForumBreadcrumbs />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-2 border-black pb-4 mb-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-4xl font-black uppercase tracking-tighter italic leading-none">
            {currentSlug.replace("-", " ")}
          </h2>
          {activeCategory && (
            <p className="text-xs font-bold uppercase text-black/40">
              {activeCategory.description}
            </p>
          )}
        </div>
        
        {activeCategory && <ForumStats forumId={activeCategory.id} />}
      </div>

      <ThreadList 
        threads={threads}
        hasNext={hasNext}
        isLoading={isLoading}
        onLoadMore={() => fetchData(false)}
      />

      <CreateThreadFAB />
    </div>
  );
}
