"use client";

import { motion } from "framer-motion";
import { describeArc, describeHitArea } from "./chart-utils";
import type { TimetableBlock } from "@/types";
import { getHorizonColor } from "@/lib/constants";

interface ChartSegmentProps {
  block: TimetableBlock;
  cx: number;
  cy: number;
  outerRadius: number;
  innerRadius: number;
  isActive: boolean;
  onTap?: (block: TimetableBlock) => void;
}

const FIXED_COLOR = "#d1d5db"; // gray-300
const FIXED_ACTIVE_COLOR = "#9ca3af"; // gray-400

export function ChartSegment({
  block,
  cx,
  cy,
  outerRadius,
  innerRadius,
  isActive,
  onTap,
}: ChartSegmentProps) {
  const color =
    block.type === "fixed"
      ? isActive
        ? FIXED_ACTIVE_COLOR
        : FIXED_COLOR
      : block.horizonKey
        ? getHorizonColor(block.horizonKey)
        : FIXED_COLOR;

  const path = describeArc(
    cx,
    cy,
    outerRadius,
    block.start,
    block.end,
    innerRadius
  );

  const hitPath = describeHitArea(
    cx,
    cy,
    outerRadius,
    block.start,
    block.end
  );

  return (
    <g>
      {/* Visible segment */}
      <motion.path
        d={path}
        fill={color}
        opacity={isActive ? 1 : 0.7}
        initial={{ opacity: 0 }}
        animate={{
          opacity: isActive ? 1 : 0.7,
          filter: isActive ? "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" : "none",
        }}
        transition={{ duration: 0.3 }}
        style={{ cursor: block.type === "horizon" ? "pointer" : "default" }}
      />
      {/* Invisible extended hit area for small segments */}
      {block.type === "horizon" && (
        <path
          d={hitPath}
          fill="transparent"
          style={{ cursor: "pointer" }}
          onClick={() => onTap?.(block)}
        />
      )}
    </g>
  );
}
