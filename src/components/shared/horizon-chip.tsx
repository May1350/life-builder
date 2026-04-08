"use client";

import { motion } from "framer-motion";
import type { HorizonKey } from "@/types";
import { getHorizon, getHorizonColor } from "@/lib/constants";

interface HorizonChipProps {
  horizonKey: HorizonKey;
  selected?: boolean;
  onClick?: (key: HorizonKey) => void;
  size?: "sm" | "md";
}

export function HorizonChip({
  horizonKey,
  selected = false,
  onClick,
  size = "md",
}: HorizonChipProps) {
  const horizon = getHorizon(horizonKey);
  const color = getHorizonColor(horizonKey);

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick?.(horizonKey)}
      className={`
        inline-flex items-center rounded-full border-2 transition-colors
        ${size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"}
        ${
          selected
            ? "text-white border-transparent"
            : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
        }
      `}
      style={selected ? { backgroundColor: color, borderColor: color } : {}}
    >
      {horizon.name}
    </motion.button>
  );
}
