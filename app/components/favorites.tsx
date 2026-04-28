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
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type FavoriteKind = "song" | "playlist" | "parish";

export type FavoriteEntry = {
  kind: FavoriteKind;
  id: string;
  title: string;
  href: string;
  subtitle?: string;
  number?: number | null;
  added_at: number;
};

type Ctx = {
  favorites: FavoriteEntry[];
  isFavorite: (kind: FavoriteKind, id: string) => boolean;
  toggle: (
    kind: FavoriteKind,
    id: string,
    meta?: Omit<FavoriteEntry, "kind" | "id" | "added_at">
  ) => Promise<void>;
  remove: (kind: FavoriteKind, id: string) => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
};

const FavoritesContext = createContext<Ctx | null>(null);

type FavoriteRow = {
  target_kind: FavoriteKind;
  target_id: string;
  created_at: string;
};

async function loadFromDb(userId: string): Promise<FavoriteEntry[]> {
  const supabase = createClient();
  const { data: rows, error } = await supabase
    .from("favorites")
    .select("target_kind, target_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !rows) return [];

  const entries = rows as FavoriteRow[];
  if (entries.length === 0) return [];

  const songIds = entries.filter((e) => e.target_kind === "song").map((e) => e.target_id);
  const playlistIds = entries.filter((e) => e.target_kind === "playlist").map((e) => e.target_id);
  const parishIds = entries.filter((e) => e.target_kind === "parish").map((e) => e.target_id);

  const [songsRes, playlistsRes, parishesRes] = await Promise.all([
    songIds.length
      ? supabase.from("songs").select("id, title, slug, number, authors(name)").in("id", songIds)
      : Promise.resolve({ data: [] as SongRow[] }),
    playlistIds.length
      ? supabase
          .from("playlists")
          .select("id, name, parishes!playlists_parish_id_fkey(slug, name)")
          .in("id", playlistIds)
      : Promise.resolve({ data: [] as PlaylistRow[] }),
    parishIds.length
      ? supabase.from("parishes").select("id, name, slug").in("id", parishIds)
      : Promise.resolve({ data: [] as ParishRow[] }),
  ]);

  const songsById = new Map<string, SongRow>(
    (songsRes.data ?? []).map((s) => [s.id, s])
  );
  const playlistsById = new Map<string, PlaylistRow>(
    (playlistsRes.data ?? []).map((p) => [p.id, p])
  );
  const parishesById = new Map<string, ParishRow>(
    (parishesRes.data ?? []).map((p) => [p.id, p])
  );

  return entries
    .map((e) => buildEntry(e, songsById, playlistsById, parishesById))
    .filter((e): e is FavoriteEntry => e !== null);
}

type SongRow = {
  id: string;
  title: string;
  slug: string;
  number: number | null;
  authors: { name: string } | { name: string }[] | null;
};

type PlaylistRow = {
  id: string;
  name: string;
  parishes: { slug: string; name: string } | { slug: string; name: string }[] | null;
};

type ParishRow = { id: string; name: string; slug: string };

function buildEntry(
  row: FavoriteRow,
  songs: Map<string, SongRow>,
  playlists: Map<string, PlaylistRow>,
  parishes: Map<string, ParishRow>
): FavoriteEntry | null {
  const added_at = new Date(row.created_at).getTime();
  if (row.target_kind === "song") {
    const s = songs.get(row.target_id);
    if (!s) return null;
    const authorRel = Array.isArray(s.authors) ? s.authors[0] : s.authors;
    return {
      kind: "song",
      id: s.id,
      title: s.title,
      href: `/canciones/${s.slug}`,
      subtitle: authorRel?.name,
      number: s.number,
      added_at,
    };
  }
  if (row.target_kind === "playlist") {
    const p = playlists.get(row.target_id);
    if (!p) return null;
    const parishRel = Array.isArray(p.parishes) ? p.parishes[0] : p.parishes;
    return {
      kind: "playlist",
      id: p.id,
      title: p.name,
      href: `/playlists/${p.id}`,
      subtitle: parishRel?.name,
      added_at,
    };
  }
  const par = parishes.get(row.target_id);
  if (!par) return null;
  return {
    kind: "parish",
    id: par.id,
    title: par.name,
    href: `/parroquias/${par.slug}`,
    added_at,
  };
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setFavorites([]);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadFromDb(user.id).then((list) => {
      setFavorites(list);
      setLoading(false);
    });
  }, [user]);

  const isFavorite = useCallback(
    (kind: FavoriteKind, id: string) =>
      favorites.some((f) => f.kind === kind && f.id === id),
    [favorites]
  );

  const toggle = useCallback<Ctx["toggle"]>(
    async (kind, id, meta) => {
      if (!user) return;
      const supabase = createClient();
      const existing = favorites.find((f) => f.kind === kind && f.id === id);
      if (existing) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("target_kind", kind)
          .eq("target_id", id);
        if (!error) {
          setFavorites((prev) =>
            prev.filter((f) => !(f.kind === kind && f.id === id))
          );
        }
        return;
      }
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, target_kind: kind, target_id: id });
      if (!error) {
        const entry: FavoriteEntry = {
          kind,
          id,
          title: meta?.title ?? id,
          href: meta?.href ?? "/",
          subtitle: meta?.subtitle,
          added_at: Date.now(),
        };
        setFavorites((prev) => [entry, ...prev]);
      }
    },
    [favorites, user]
  );

  const remove = useCallback<Ctx["remove"]>(
    async (kind, id) => {
      if (!user) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("target_kind", kind)
        .eq("target_id", id);
      if (!error) {
        setFavorites((prev) =>
          prev.filter((f) => !(f.kind === kind && f.id === id))
        );
      }
    },
    [user]
  );

  const value = useMemo(
    () => ({
      favorites,
      isFavorite,
      toggle,
      remove,
      isAuthenticated: Boolean(user),
      loading,
    }),
    [favorites, isFavorite, toggle, remove, user, loading]
  );

  return <FavoritesContext value={value}>{children}</FavoritesContext>;
}

export function useFavorites(): Ctx {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites debe usarse dentro de FavoritesProvider");
  return ctx;
}
