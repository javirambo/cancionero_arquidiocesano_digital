"use client";

import { useEffect } from "react";
import type { Serwist } from "@serwist/window";

declare global {
  interface Window {
    serwist?: Serwist;
  }
}

export function SWRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.serwist !== undefined
    ) {
      window.serwist.register().catch((err) => {
        console.error("[sw] register error:", err);
      });
    }
  }, []);

  return null;
}
