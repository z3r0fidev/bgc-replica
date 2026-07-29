"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { forumsService, ForumCategoryTree } from "@/services/forums";

export function ForumHeader() {
  const params = useParams();
  const [activeCategory, setActiveCategory] = useState<ForumCategoryTree | null>(null);
  
  // The slug is often an array in [...slug] routes
  const slugs = params.slug as string[];
  const currentSlug = slugs ? slugs[slugs.length - 1] : null;

  useEffect(() => {
    if (currentSlug) {
      forumsService.getTree().then(tree => {
        // Flatten tree to find active category
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
        setActiveCategory(findInTree(tree));
      });
    }
  }, [currentSlug]);

  if (!activeCategory) return null;

  return (
    <div className="w-full mb-8">
      <div className="relative w-full h-[100px] md:h-[140px] overflow-hidden rounded-sm border border-black/10 liquid-glass mb-4">
        {activeCategory.banner_path ? (
          <Image
            src={activeCategory.banner_path}
            alt={activeCategory.name}
            fill
            sizes="100vw"
            className="object-cover opacity-40 mix-blend-multiply"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/5" />
        )}
        
        <div className="absolute inset-0 flex flex-col justify-center px-8">
          <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-[#4C1230] drop-shadow-sm">
            {activeCategory.name}
          </h1>
          {activeCategory.description && (
            <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-[#4C1230]/60 mt-1 max-w-2xl truncate">
              {activeCategory.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
