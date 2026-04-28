"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type FavoriteKind = "song" | "playlist" | "parish";

export type FavoriteEntry = {
  kind: FavoriteKind;
  id: string;
  // Datos para mostrar en el popup sin re-fetchear.
  title: string;
  href: string;
  subtitle?: string;
  added_at: number;
};

type Ctx = {
  favorites: FavoriteEntry[];
  isFavorite: (kind: FavoriteKind, id: string) => boolean;
  toggle: (kind: FavoriteKind, id: string, meta?: Omit<FavoriteEntry, "kind" | "id" | "added_at">) => void;
  remove: (kind: FavoriteKind, id: string) => void;
};

const FavoritesContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "favorites:v1";

function loadFromStorage(): FavoriteEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is FavoriteEntry =>
        e &&
        (e.kind === "song" || e.kind === "playlist" || e.kind === "parish") &&
        typeof e.id === "string"
    );
  } catch {
    return [];
  }
}

function saveToStorage(list: FavoriteEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Quota o modo privado: ignorar.
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);

  // Cargar después del mount para evitar mismatch SSR/CSR.
  useEffect(() => {
    setFavorites(loadFromStorage());
  }, []);

  const isFavorite = useCallback(
    (kind: FavoriteKind, id: string) =>
      favorites.some((f) => f.kind === kind && f.id === id),
    [favorites]
  );

  const toggle = useCallback<Ctx["toggle"]>((kind, id, meta) => {
    setFavorites((prev) => {
      const existing = prev.find((f) => f.kind === kind && f.id === id);
      let next: FavoriteEntry[];
      if (existing) {
        next = prev.filter((f) => !(f.kind === kind && f.id === id));
      } else {
        const entry: FavoriteEntry = {
          kind,
          id,
          title: meta?.title ?? id,
          href: meta?.href ?? "/",
          subtitle: meta?.subtitle,
          added_at: Date.now(),
        };
        next = [entry, ...prev];
      }
      saveToStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback<Ctx["remove"]>((kind, id) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => !(f.kind === kind && f.id === id));
      saveToStorage(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ favorites, isFavorite, toggle, remove }),
    [favorites, isFavorite, toggle, remove]
  );

  return <FavoritesContext value={value}>{children}</FavoritesContext>;
}

export function useFavorites(): Ctx {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites debe usarse dentro de FavoritesProvider");
  return ctx;
}
