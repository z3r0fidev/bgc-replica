"use client";

import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { FeaturedListsSidebar } from "./sidebar";
import { cn } from "@/lib/utils";

export function PersonalsMobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-black text-white rounded-full shadow-2xl ring-2 ring-white/20"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={cn(
        "fixed right-0 top-0 bottom-0 w-[280px] bg-black z-50 p-6 transition-transform duration-300 ease-in-out border-l border-[#8E8E8E]",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider border-b border-[#8E8E8E] pb-2 text-center">
          Featured Lists
        </h2>
        <div onClick={() => setIsOpen(false)}>
          <FeaturedListsSidebar />
        </div>
      </div>
    </div>
  );
}
