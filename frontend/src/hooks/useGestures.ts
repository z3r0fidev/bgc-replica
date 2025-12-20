"use client";

import { useDragControls } from "framer-motion";
import { useState } from "react";

export const useGestures = () => {
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const controls = useDragControls();

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      setSwipeDirection("right");
    } else if (info.offset.x < -threshold) {
      setSwipeDirection("left");
    } else {
      setSwipeDirection(null);
    }
  };

  return {
    controls,
    swipeDirection,
    handleDragEnd,
    resetSwipe: () => setSwipeDirection(null),
  };
};
