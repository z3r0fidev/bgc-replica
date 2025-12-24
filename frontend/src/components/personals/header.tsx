"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { personalsService, PersonalCategory } from "@/services/personals";

export function PersonalsHeader() {
  const params = useParams();
  const [currentCategory, setCurrentCategory] = useState<PersonalCategory | null>(null);
  const activeSlug = params.category as string;

  useEffect(() => {
    personalsService.getCategories().then((cats) => {
      const found = cats.find((c) => c.slug === activeSlug);
      setCurrentCategory(found || cats[0] || null);
    });
  }, [activeSlug]);

  if (!currentCategory) return <div className="h-[100px] bg-black/5 animate-pulse" />;

  return (
    <div className="w-full">
      <div className="relative w-full h-[120px] md:h-[180px] overflow-hidden">
        <Image
          src={currentCategory.banner}
          alt={currentCategory.name}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center p-8">
          <h1 className="text-white text-3xl md:text-5xl font-black uppercase tracking-tighter italic">
            {currentCategory.name}
          </h1>
        </div>
      </div>
      <div className="bg-black text-white px-4 py-2 text-sm font-bold flex justify-between items-center border-b border-[#8E8E8E]">
        <div className="flex gap-4">
          <span>GALLERY</span>
          <span className="text-[#8E8E8E]">|</span>
          <span>PHILADELPHIA</span>
        </div>
        <div className="hidden md:block">
          TRANSX.COM
        </div>
      </div>
    </div>
  );
}
