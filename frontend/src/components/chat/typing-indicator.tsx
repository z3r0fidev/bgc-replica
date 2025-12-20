"use client";

import { motion } from "framer-motion";

export function TypingIndicator({ username }: { username?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-muted-foreground text-xs italic">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 bg-current rounded-full"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
      <span>{username ? `${username} is typing...` : "Typing..."}</span>
    </div>
  );
}
