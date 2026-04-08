"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

interface Props {
  goalCount: number;
  taskCount: number;
  onContinue: () => void;
}

export function DayReady({ goalCount, taskCount, onContinue }: Props) {
  useEffect(() => {
    const timer = setTimeout(onContinue, 2500);
    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 flex flex-col items-center justify-center px-8 cursor-pointer"
      onClick={onContinue}
    >
      <div className="text-4xl mb-4">&#127919;</div>
      <h2 className="text-xl font-bold text-gray-900">Your day is ready</h2>
      <div className="flex gap-6 mt-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{goalCount}</p>
          <p className="text-xs text-gray-500">goals</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{taskCount}</p>
          <p className="text-xs text-gray-500">tasks</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-6">Tap to continue</p>
    </motion.div>
  );
}
