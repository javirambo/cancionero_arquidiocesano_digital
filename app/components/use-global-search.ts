"use client";

import { useEffect, useState } from "react";
import type { GlobalSearchResults } from "@/lib/songs";

const EMPTY: GlobalSearchResults = { songs: [], playlists: [], parishes: [] };

// Búsqueda global con debounce contra /api/search. `active` permite pausar
// la búsqueda cuando el contenedor (modal o caja flotante) está cerrado.
export function useGlobalSearch(active: boolean) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) return;
    const term = q.trim();
    if (!term) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error("search failed");
        const data: GlobalSearchResults = await res.json();
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, active]);

  const totalResults =
    results.songs.length + results.playlists.length + results.parishes.length;

  const reset = () => {
    setQ("");
    setResults(EMPTY);
    setLoading(false);
  };

  return { q, setQ, results, loading, totalResults, reset };
}
