"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/use-app-store";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function OfflineIndicator() {
  const { isOnline, setOnline } = useAppStore();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground py-1 px-4 text-center text-xs font-bold flex items-center justify-center gap-2"
        >
          <WifiOff className="h-3 w-3" />
          <span>You are currently offline. Some features may be unavailable.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
