"use client";

import React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function CreateThreadFAB() {
  return (
    <button
      onClick={() => alert("Create Thread Modal/Page coming soon!")}
      className={cn(
        "fixed bottom-8 right-8 z-50",
        "flex items-center gap-2 px-6 py-4 bg-black text-white rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 group",
        "ring-2 ring-white/20 hover:ring-white/40"
      )}
    >
      <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
      <span className="text-sm font-black uppercase tracking-widest hidden sm:inline">
        Create Thread
      </span>
    </button>
  );
}
