"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { useParams } from "next/navigation";
import { forumsService, ForumCategoryTree } from "@/services/forums";

export function ForumBreadcrumbs() {
  const params = useParams();
  const slugs = params.slug as string[];
  const [path, setPath] = useState<ForumCategoryTree[]>([]);

  useEffect(() => {
    if (slugs && slugs.length > 0) {
      forumsService.getTree().then(tree => {
        const result: ForumCategoryTree[] = [];
        let currentNodes = tree;
        
        for (const slug of slugs) {
          const found = currentNodes.find(n => n.slug === slug);
          if (found) {
            result.push(found);
            currentNodes = found.children || [];
          } else {
            break;
          }
        }
        setPath(result);
      });
    } else {
      setPath([]);
    }
  }, [slugs]);

  return (
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/40 mb-4">
      <Link href="/forums" className="hover:text-black transition-colors flex items-center gap-1">
        <Home size={12} />
        HOME
      </Link>
      
      {path.map((node, index) => (
        <React.Fragment key={node.id}>
          <ChevronRight size={10} />
          <Link 
            href={`/forums/${path.slice(0, index + 1).map(n => n.slug).join('/')}`}
            className={index === path.length - 1 ? "text-black" : "hover:text-black transition-colors"}
          >
            {node.name}
          </Link>
        </React.Fragment>
      ))}
    </div>
  );
}
