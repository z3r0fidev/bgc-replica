"use client";

import React, { useEffect, useState } from "react";
import { ForumTreeNav } from "@/components/forums/tree-nav";
import { forumsService, ForumCategoryTree } from "@/services/forums";
import { Skeleton } from "@/components/ui/skeleton";

export default function ForumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tree, setTree] = useState<ForumCategoryTree[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    forumsService.getTree().then((data) => {
      setTree(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex min-h-screen bg-[#EEEEEE] text-[#4C1230]">
      {/* Left Tree Navigation Sidebar */}
      <aside className="hidden md:flex flex-col w-[280px] bg-black text-white border-r border-[#8E8E8E] sticky top-0 h-screen">
        <div className="p-6 border-b border-[#8E8E8E]">
          <h1 className="text-2xl font-black italic tracking-tighter uppercase">
            Communities
          </h1>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-6 w-full bg-white/10" />
              <Skeleton className="h-6 w-3/4 bg-white/10 ml-4" />
              <Skeleton className="h-6 w-full bg-white/10" />
            </div>
          ) : (
            <ForumTreeNav categories={tree} />
          )}
        </div>
        
        <div className="p-4 bg-white/5 border-t border-[#8E8E8E]">
          <p className="text-[10px] font-bold text-center uppercase tracking-widest opacity-40">
            BGC Replica Forums v1.0
          </p>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 min-w-0">
        {children}
      </main>
    </div>
  );
}
