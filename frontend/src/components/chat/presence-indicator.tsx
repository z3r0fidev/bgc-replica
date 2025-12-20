"use client";

import { cn } from "@/lib/utils";

interface PresenceIndicatorProps {
  status: "online" | "offline" | "idle";
  className?: string;
}

export function PresenceIndicator({ status, className }: PresenceIndicatorProps) {
  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
        status === "online" && "bg-green-500",
        status === "idle" && "bg-yellow-500",
        status === "offline" && "bg-gray-400",
        className
      )}
    />
  );
}
