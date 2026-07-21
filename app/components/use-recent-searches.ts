"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "search:recent:v1";
const MAX_RECENT = 6;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t): t is string => typeof t === "string")
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function writeRecent(list: string[]): void {
  if (typeof window === "undefined") return;
  try {
    if (list.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch {
    // Silencioso: si localStorage está lleno o bloqueado, perdemos el cambio.
  }
}

// Historial de las últimas 6 búsquedas del buscador del header, persistido en
// localStorage. Sigue el patrón de lectura/escritura de favorites.tsx.
export function useRecentSearches() {
  // Inicialización perezosa: en SSR readRecent devuelve [] (guard de window);
  // en cliente lee localStorage una sola vez. El modal renderiza null cerrado,
  // así que la lista nunca está en el HTML inicial (sin mismatch de hidratación).
  const [recent, setRecent] = useState<string[]>(readRecent);

  // Guarda un término al frente, sin duplicados (comparación sin distinguir
  // mayúsculas) y con tope de 6.
  const addRecent = useCallback((raw: string) => {
    const term = raw.trim();
    if (!term) return;
    setRecent((prev) => {
      const rest = prev.filter((t) => t.toLowerCase() !== term.toLowerCase());
      const next = [term, ...rest].slice(0, MAX_RECENT);
      writeRecent(next);
      return next;
    });
  }, []);

  return { recent, addRecent };
}
