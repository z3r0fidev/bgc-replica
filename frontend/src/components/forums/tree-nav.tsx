"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronDown, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { ForumCategoryTree } from "@/services/forums";

interface TreeItemProps {
  category: ForumCategoryTree;
  depth?: number;
}

function TreeItem({ category, depth = 0 }: TreeItemProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  const pathname = usePathname();
  const hasChildren = category.children && category.children.length > 0;
  const isActive = pathname.includes(`/forums/${category.slug}`);

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "flex items-center gap-2 py-1 px-2 rounded-sm transition-colors hover:bg-white/10 group cursor-pointer",
          isActive && "bg-white/20 text-white font-bold"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
          className={cn(
            "p-0.5 rounded hover:bg-white/20 transition-transform",
            !hasChildren && "invisible"
          )}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        
        <Link 
          href={`/forums/${category.slug}`} 
          className="flex items-center gap-2 flex-1 overflow-hidden"
        >
          <Folder size={14} className="flex-shrink-0 opacity-60" />
          <span className="truncate text-sm uppercase tracking-tight">
            {category.name}
          </span>
        </Link>
      </div>

      {hasChildren && isOpen && (
        <div className="flex flex-col">
          {category.children.map((child) => (
            <TreeItem key={child.id} category={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ForumTreeNav({ categories }: { categories: ForumCategoryTree[] }) {
  return (
    <nav className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
      {categories.map((cat) => (
        <TreeItem key={cat.id} category={cat} />
      ))}
    </nav>
  );
}
