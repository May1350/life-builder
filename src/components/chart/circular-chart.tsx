"use client";

import { useMemo } from "react";
import type { TimetableBlock } from "@/types";
import { ChartSegment } from "./chart-segment";
import { ClockHand } from "./clock-hand";
import { timeToMinutes, nowTime } from "@/lib/time-utils";

interface CircularChartProps {
  blocks: TimetableBlock[];
  size?: number;
  onSegmentTap?: (block: TimetableBlock) => void;
  showHand?: boolean;
}

const HOUR_LABELS = [0, 3, 6, 9, 12, 15, 18, 21];

export function CircularChart({
  blocks,
  size = 320,
  onSegmentTap,
  showHand = true,
}: CircularChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 24;
  const innerRadius = outerRadius * 0.35;

  const currentTime = nowTime();
  const currentMinutes = timeToMinutes(currentTime);

  const activeBlock = useMemo(() => {
    return blocks.find((b) => {
      const s = timeToMinutes(b.start);
      const e = timeToMinutes(b.end);
      return currentMinutes >= s && currentMinutes < e;
    });
  }, [blocks, currentMinutes]);

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-sm"
      >
        {/* Background circle */}
        <circle
          cx={cx}
          cy={cy}
          r={outerRadius}
          fill="#f9fafb"
          stroke="#e5e7eb"
          strokeWidth={1}
        />

        {/* Inner circle (center area) */}
        <circle cx={cx} cy={cy} r={innerRadius} fill="white" />

        {/* Segments */}
        {blocks.map((block, i) => (
          <ChartSegment
            key={`${block.start}-${block.end}-${i}`}
            block={block}
            cx={cx}
            cy={cy}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            isActive={block === activeBlock}
            onTap={onSegmentTap}
          />
        ))}

        {/* Hour tick marks and labels */}
        {HOUR_LABELS.map((hour) => {
          const angle =
            (((hour * 60) / 1440) * 2 * Math.PI) - Math.PI / 2;
          const tickStart = outerRadius - 6;
          const tickEnd = outerRadius;
          const labelR = outerRadius + 14;

          const x1 = cx + tickStart * Math.cos(angle);
          const y1 = cy + tickStart * Math.sin(angle);
          const x2 = cx + tickEnd * Math.cos(angle);
          const y2 = cy + tickEnd * Math.sin(angle);
          const lx = cx + labelR * Math.cos(angle);
          const ly = cy + labelR * Math.sin(angle);

          return (
            <g key={hour}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#9ca3af"
                strokeWidth={1.5}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-gray-400 text-[10px] font-medium select-none"
              >
                {hour.toString().padStart(2, "0")}
              </text>
            </g>
          );
        })}

        {/* Clock hand */}
        {showHand && (
          <ClockHand cx={cx} cy={cy} radius={outerRadius} />
        )}

        {/* Center text */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-gray-900 text-sm font-semibold select-none"
        >
          {currentTime}
        </text>
        {activeBlock && (
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-gray-500 text-[10px] select-none"
          >
            {activeBlock.type === "fixed"
              ? activeBlock.title
              : activeBlock.horizonName}
          </text>
        )}
      </svg>
    </div>
  );
}
