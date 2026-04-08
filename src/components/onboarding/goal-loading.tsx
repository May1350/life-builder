"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MESSAGES = [
  "Understanding your vision...",
  "Designing your goals...",
  "Creating starter tasks...",
  "Almost ready...",
];

interface Props {
  error: boolean;
  onRetry: () => void;
  onSkip: () => void;
}

export function GoalLoading({ error, onRetry, onSkip }: Props) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setMsgIndex((i) => (i < MESSAGES.length - 1 ? i + 1 : i));
    }, 1200);
    return () => clearInterval(interval);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8">
      {error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-gray-900 font-medium mb-2">Something went wrong</p>
          <p className="text-sm text-gray-500 mb-6">
            We couldn&apos;t generate your goals. You can try again or skip for now.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onSkip}>Skip for now</Button>
            <Button onClick={onRetry}>Try again</Button>
          </div>
        </motion.div>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-gray-500"
            >
              {MESSAGES[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
