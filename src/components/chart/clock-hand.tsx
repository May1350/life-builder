"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { polarToCartesian, timeToAngle } from "./chart-utils";
import { nowTime } from "@/lib/time-utils";

interface ClockHandProps {
  cx: number;
  cy: number;
  radius: number;
}

export function ClockHand({ cx, cy, radius }: ClockHandProps) {
  const [currentTime, setCurrentTime] = useState(nowTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(nowTime());
    }, 60_000); // update every minute
    return () => clearInterval(interval);
  }, []);

  const angle = timeToAngle(currentTime);
  const tip = polarToCartesian(cx, cy, radius - 8, angle);
  const base = polarToCartesian(cx, cy, 8, angle);

  return (
    <g>
      {/* Hand line */}
      <motion.line
        x1={base.x}
        y1={base.y}
        x2={tip.x}
        y2={tip.y}
        stroke="#111827"
        strokeWidth={2.5}
        strokeLinecap="round"
        animate={{ x2: tip.x, y2: tip.y }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={5} fill="#111827" />
    </g>
  );
}
