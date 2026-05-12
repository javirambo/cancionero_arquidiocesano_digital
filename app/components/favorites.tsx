"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "./session";

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

export type MergeStrategy = "combine" | "keep-server" | "replace-with-local";

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
  /** Conflicto pendiente al loguearse: hay favoritos locales y remotos distintos. */
  pendingConflict: {
    local: FavoriteEntry[];
    remote: FavoriteEntry[];
  } | null;
  /** Resuelve el conflicto pendiente con la estrategia elegida. */
  resolveConflict: (strategy: MergeStrategy) => Promise<void>;
};

const FavoritesContext = createContext<Ctx | null>(null);

const GUEST_STORAGE_KEY = "favorites:guest:v1";

type FavoriteRow = {
  target_kind: FavoriteKind;
  target_id: string;
  created_at: string;
};

function readGuestFavorites(): FavoriteEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e) =>
        e &&
        typeof e === "object" &&
        (e.kind === "song" || e.kind === "playlist" || e.kind === "parish") &&
        typeof e.id === "string"
    );
  } catch {
    return [];
  }
}

function writeGuestFavorites(list: FavoriteEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    if (list.length === 0) {
      window.localStorage.removeItem(GUEST_STORAGE_KEY);
    } else {
      window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(list));
    }
  } catch {
    // Silencioso: si localStorage está lleno o bloqueado, perdemos el cambio.
  }
}

function sameKey(a: FavoriteEntry, b: FavoriteEntry): boolean {
  return a.kind === b.kind && a.id === b.id;
}

function dedupe(list: FavoriteEntry[]): FavoriteEntry[] {
  const seen = new Set<string>();
  const out: FavoriteEntry[] = [];
  for (const e of list) {
    const key = `${e.kind}:${e.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function setsEqual(a: FavoriteEntry[], b: FavoriteEntry[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a.map((e) => `${e.kind}:${e.id}`));
  for (const e of b) if (!setA.has(`${e.kind}:${e.id}`)) return false;
  return true;
}

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
      ? supabase.from("songs").select("id, title, slug, number, author1:authors!songs_author_id_fkey(name), author2:authors!songs_author2_id_fkey(name)").in("id", songIds)
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
  author1: { name: string } | { name: string }[] | null;
  author2: { name: string } | { name: string }[] | null;
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
    const n1 = (Array.isArray(s.author1) ? s.author1[0] : s.author1)?.name;
    const n2 = (Array.isArray(s.author2) ? s.author2[0] : s.author2)?.name;
    const subtitle = [n1, n2].filter(Boolean).join(", ") || undefined;
    return {
      kind: "song",
      id: s.id,
      title: s.title,
      href: `/canciones/${s.slug}`,
      subtitle,
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

async function bulkInsertFavorites(
  userId: string,
  entries: FavoriteEntry[]
): Promise<void> {
  if (entries.length === 0) return;
  const supabase = createClient();
  const rows = entries.map((e) => ({
    user_id: userId,
    target_kind: e.kind,
    target_id: e.id,
  }));
  // upsert para idempotencia (la PK es user_id+target_kind+target_id).
  await supabase.from("favorites").upsert(rows, {
    onConflict: "user_id,target_kind,target_id",
    ignoreDuplicates: true,
  });
}

async function deleteAllFavorites(userId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("favorites").delete().eq("user_id", userId);
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingConflict, setPendingConflict] = useState<Ctx["pendingConflict"]>(
    null
  );
  // Para detectar la transición invitado → autenticado y disparar el merge.
  const lastUserIdRef = useRef<string | null>(null);

  // Pre-carga inmediata desde localStorage para que el invitado vea sus
  // favoritos sin parpadeo.
  useEffect(() => {
    setFavorites(readGuestFavorites());
    setLoading(false);
  }, []);

  // Logout: volvemos al modo invitado.
  useEffect(() => {
    if (user) return;
    lastUserIdRef.current = null;
    setFavorites(readGuestFavorites());
    setPendingConflict(null);
  }, [user]);

  // Cuando cambia el user (login), cargar de BD y mergear con locales.
  useEffect(() => {
    if (!user) return;
    if (lastUserIdRef.current === user.id) return;
    lastUserIdRef.current = user.id;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const local = readGuestFavorites();
        const remote = await loadFromDb(user.id);
        if (cancelled) return;

        // Caso 1: no hay locales → solo cargar remotos.
        if (local.length === 0) {
          setFavorites(remote);
          return;
        }

        // Caso 2: remotos vacíos → transferir locales sin preguntar.
        if (remote.length === 0) {
          await bulkInsertFavorites(user.id, local);
          if (cancelled) return;
          const fresh = await loadFromDb(user.id);
          if (cancelled) return;
          writeGuestFavorites([]);
          setFavorites(fresh);
          return;
        }

        // Caso 3: ambos no vacíos. Si los conjuntos son iguales, no hay
        // conflicto: usamos los remotos (con sus metadatos completos).
        if (setsEqual(local, remote)) {
          writeGuestFavorites([]);
          setFavorites(remote);
          return;
        }

        // Caso 4: hay conflicto real → mostrar diálogo.
        setFavorites(remote);
        setPendingConflict({ local, remote });
      } catch (err) {
        console.error("[favorites] login effect error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      // Si nos cancelan antes de terminar, soltamos el lock para que la
      // siguiente invocación reintente con el mismo user.id.
      if (lastUserIdRef.current === user.id) {
        lastUserIdRef.current = null;
      }
    };
  }, [user]);

  const isFavorite = useCallback(
    (kind: FavoriteKind, id: string) =>
      favorites.some((f) => f.kind === kind && f.id === id),
    [favorites]
  );

  const toggle = useCallback<Ctx["toggle"]>(
    async (kind, id, meta) => {
      const existing = favorites.find((f) => f.kind === kind && f.id === id);

      if (!user) {
        // Modo invitado: solo localStorage.
        const next = existing
          ? favorites.filter((f) => !sameKey(f, { ...f, kind, id }))
          : [
              {
                kind,
                id,
                title: meta?.title ?? id,
                href: meta?.href ?? "/",
                subtitle: meta?.subtitle,
                number: meta?.number,
                added_at: Date.now(),
              } as FavoriteEntry,
              ...favorites,
            ];
        setFavorites(next);
        writeGuestFavorites(next);
        return;
      }

      const supabase = createClient();
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
          number: meta?.number,
          added_at: Date.now(),
        };
        setFavorites((prev) => [entry, ...prev]);
      }
    },
    [favorites, user]
  );

  const remove = useCallback<Ctx["remove"]>(
    async (kind, id) => {
      if (!user) {
        const next = favorites.filter((f) => !(f.kind === kind && f.id === id));
        setFavorites(next);
        writeGuestFavorites(next);
        return;
      }
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
    [favorites, user]
  );

  const resolveConflict = useCallback<Ctx["resolveConflict"]>(
    async (strategy) => {
      if (!user || !pendingConflict) return;
      const { local, remote } = pendingConflict;

      if (strategy === "combine") {
        // Merge: insertar locales que no estén en remoto (upsert idempotente).
        const onlyLocal = local.filter(
          (l) => !remote.some((r) => sameKey(l, r))
        );
        if (onlyLocal.length > 0) {
          await bulkInsertFavorites(user.id, onlyLocal);
        }
        const fresh = await loadFromDb(user.id);
        writeGuestFavorites([]);
        setFavorites(fresh);
        setPendingConflict(null);
        return;
      }

      if (strategy === "keep-server") {
        writeGuestFavorites([]);
        setPendingConflict(null);
        // favorites ya tiene los remotos.
        return;
      }

      // replace-with-local: borrar todos los remotos y subir los locales.
      await deleteAllFavorites(user.id);
      await bulkInsertFavorites(user.id, dedupe(local));
      const fresh = await loadFromDb(user.id);
      writeGuestFavorites([]);
      setFavorites(fresh);
      setPendingConflict(null);
    },
    [user, pendingConflict]
  );

  const value = useMemo(
    () => ({
      favorites,
      isFavorite,
      toggle,
      remove,
      isAuthenticated: Boolean(user),
      loading,
      pendingConflict,
      resolveConflict,
    }),
    [favorites, isFavorite, toggle, remove, user, loading, pendingConflict, resolveConflict]
  );

  return <FavoritesContext value={value}>{children}</FavoritesContext>;
}

export function useFavorites(): Ctx {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites debe usarse dentro de FavoritesProvider");
  return ctx;
}
