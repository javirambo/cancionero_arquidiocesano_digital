"use client";

import { useEffect, useState } from "react";

const LETTER_SCALE_KEY = "song:letterScale";
export const LETTER_SCALE_MIN = 0.8;
export const LETTER_SCALE_MAX = 2;
export const LETTER_SCALE_STEP = 0.1;

function read(): number {
  if (typeof window === "undefined") return 1;
  const raw = window.localStorage.getItem(LETTER_SCALE_KEY);
  if (raw === null) return 1;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < LETTER_SCALE_MIN || n > LETTER_SCALE_MAX) {
    return 1;
  }
  return n;
}

const subscribers = new Set<(n: number) => void>();
function publish(n: number) {
  subscribers.forEach((fn) => fn(n));
}

export function useLetterScale(): {
  scale: number;
  setScale: (n: number) => void;
  adjust: (delta: number) => void;
} {
  const [scale, setScaleState] = useState<number>(() => read());

  useEffect(() => {
    subscribers.add(setScaleState);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LETTER_SCALE_KEY) setScaleState(read());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      subscribers.delete(setScaleState);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setScale = (n: number) => {
    const clamped = Math.min(LETTER_SCALE_MAX, Math.max(LETTER_SCALE_MIN, n));
    window.localStorage.setItem(LETTER_SCALE_KEY, String(clamped));
    publish(clamped);
  };

  const adjust = (delta: number) => {
    setScale(Math.round((scale + delta) * 10) / 10);
  };

  return { scale, setScale, adjust };
}
