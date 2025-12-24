"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { personalsService, PersonalCategory } from "@/services/personals";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function FeaturedListsSidebar() {
  const [categories, setCategories] = useState<PersonalCategory[]>([]);
  const params = useParams();
  const activeCategory = params.category as string;

  useEffect(() => {
    personalsService.getCategories().then(setCategories);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-2">
      {categories.map((cat) => (
        <Link
          key={cat.slug}
          href={`/personals/${cat.slug}`}
          className={cn(
            "flex items-center gap-3 p-2 rounded transition-colors hover:bg-white/10",
            activeCategory === cat.slug && "bg-white/20 ring-1 ring-white/30"
          )}
        >
          <div className="relative w-8 h-8 flex-shrink-0">
            <Image
              src={cat.icon}
              alt={cat.name}
              fill
              className="object-contain"
            />
          </div>
          <span className="text-sm font-semibold uppercase tracking-tight">
            {cat.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
