"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";

export function useDbReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    db.open()
      .then(() => setReady(true))
      .catch((err) => console.error("Failed to open DB:", err));
  }, []);

  return ready;
}
