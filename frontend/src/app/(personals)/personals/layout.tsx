import React from "react";
import { PersonalsHeader } from "@/components/personals/header";
import { FeaturedListsSidebar } from "@/components/personals/sidebar";
import { PersonalsMobileNav } from "@/components/personals/mobile-nav";

export default function PersonalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#EEEEEE] text-[#4C1230]">
      <main className="flex-1 flex flex-col min-w-0">
        <PersonalsHeader />
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
      {/* Sidebar for Desktop */}
      <aside className="hidden md:block w-[300px] border-l border-[#8E8E8E] bg-black text-white p-4 sticky top-0 h-screen overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 uppercase tracking-wider text-center border-b border-[#8E8E8E] pb-2">
          Featured Lists
        </h2>
        <FeaturedListsSidebar />
      </aside>
      {/* Mobile Navigation */}
      <PersonalsMobileNav />
    </div>
  );
}
