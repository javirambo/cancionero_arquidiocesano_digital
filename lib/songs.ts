import { createClient } from "@/lib/supabase/server";

export type SongSummary = {
  id: string;
  number: number | null;
  title: string;
  slug: string;
  category: string | null;
  author: string | null;
};

// Capacidades de una canción mostradas como badges (CU-23). Las computamos
// junto al listado para evitar N+1; quedan asociadas por song.id.
export type SongCapabilities = {
  hasChords: boolean;
  hasYoutube: boolean;
  hasFiles: boolean;
};

type Named = { name: string } | { name: string }[] | null;
function firstName(rel: Named): string | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0]?.name ?? null;
  return rel.name ?? null;
}

export type Song = SongSummary & {
  body: string;
  original_key: string | null;
  youtube_url: string | null;
};

export async function listPublishedSongs(limit = 100): Promise<SongSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("songs")
    .select("id, number, title, slug, categories(name), authors(name)")
    .eq("status", "published")
    .order("number", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  // Supabase devuelve relación como objeto único cuando la FK es 1-1.
  return (data ?? []).map((row) => ({
    id: row.id as string,
    number: row.number as number | null,
    title: row.title as string,
    slug: row.slug as string,
    category: firstName(row.categories as Named),
    author: firstName(row.authors as Named),
  }));
}

export async function getSongBySlug(slug: string): Promise<Song | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("songs")
    .select(
      "id, number, title, slug, body, original_key, youtube_url, categories(name), authors(name)"
    )
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    number: data.number as number | null,
    title: data.title as string,
    slug: data.slug as string,
    body: data.body as string,
    original_key: data.original_key as string | null,
    youtube_url: data.youtube_url as string | null,
    category: firstName(data.categories as Named),
    author: firstName(data.authors as Named),
  };
}

export async function listSongsWithCapabilities(
  q: string = "",
  limit = 100
): Promise<(SongSummary & SongCapabilities)[]> {
  const supabase = await createClient();
  const term = q.trim();

  // Si hay query: usamos el RPC accent-insensitive para obtener IDs y luego
  // fetcheamos capacidades. Si no, traemos todo el catálogo directo.
  if (term) {
    const { data: matches, error: rpcErr } = await supabase.rpc("search_songs", {
      q: term,
      lim: limit,
    });
    if (rpcErr) throw rpcErr;
    const ids = ((matches ?? []) as { id: string }[]).map((r) => r.id);
    if (ids.length === 0) return [];
    const { data: rows, error } = await supabase
      .from("songs")
      .select(
        "id, number, title, slug, body, youtube_url, categories(name), authors(name), song_files(id, status)"
      )
      .in("id", ids);
    if (error) throw error;
    // Mantener el orden del RPC.
    const byId = new Map((rows ?? []).map((r) => [r.id as string, r]));
    return ids
      .map((id) => byId.get(id))
      .filter((row): row is NonNullable<typeof row> => row !== undefined)
      .map((row) => {
        const body = (row.body as string | null) ?? "";
        const files = (row.song_files as { status: string }[] | null) ?? [];
        return {
          id: row.id as string,
          number: row.number as number | null,
          title: row.title as string,
          slug: row.slug as string,
          category: firstName(row.categories as Named),
          author: firstName(row.authors as Named),
          hasChords: /\[[^\]]+\]/.test(body),
          hasYoutube: Boolean(row.youtube_url),
          hasFiles: files.some((f) => f.status === "published"),
        };
      });
  }

  // Sin query: catálogo completo ordenado por número.
  const { data, error } = await supabase
    .from("songs")
    .select(
      "id, number, title, slug, body, youtube_url, categories(name), authors(name), song_files(id, status)"
    )
    .eq("status", "published")
    .order("number", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const body = (row.body as string | null) ?? "";
    const files = (row.song_files as { status: string }[] | null) ?? [];
    return {
      id: row.id as string,
      number: row.number as number | null,
      title: row.title as string,
      slug: row.slug as string,
      category: firstName(row.categories as Named),
      author: firstName(row.authors as Named),
      hasChords: /\[[^\]]+\]/.test(body),
      hasYoutube: Boolean(row.youtube_url),
      hasFiles: files.some((f) => f.status === "published"),
    };
  });
}

export async function searchSongs(q: string, limit = 50): Promise<SongSummary[]> {
  const supabase = await createClient();
  const term = q.trim();
  if (!term) return listPublishedSongs(limit);
  const { data, error } = await supabase.rpc("search_songs", {
    q: term,
    lim: limit,
  });
  if (error) throw error;
  return (data ?? []) as SongSummary[];
}

export type GlobalSearchResults = {
  songs: SongSummary[];
  playlists: PlaylistSummary[];
  parishes: Parish[];
};

export async function searchGlobal(q: string): Promise<GlobalSearchResults> {
  const term = q.trim();
  if (!term) return { songs: [], playlists: [], parishes: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_global", { q: term });
  if (error) throw error;
  if (!data) return { songs: [], playlists: [], parishes: [] };
  // El RPC devuelve { songs, playlists, parishes } como jsonb.
  type RpcResult = {
    songs: SongSummary[];
    playlists: {
      id: string;
      name: string;
      description: string | null;
      event_date: string | null;
      parish: { name: string; slug: string } | null;
    }[];
    parishes: Parish[];
  };
  const r = data as RpcResult;
  return {
    songs: r.songs ?? [],
    playlists: r.playlists ?? [],
    parishes: r.parishes ?? [],
  };
}

// =====================================================================
// Playlists
// =====================================================================

export type PlaylistSummary = {
  id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  parish: { name: string; slug: string } | null;
};

type ParishRel = { name: string; slug: string } | { name: string; slug: string }[] | null;
function firstParish(rel: ParishRel): { name: string; slug: string } | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel;
}

// =====================================================================
// Parroquias
// =====================================================================

export type Parish = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  city: string | null;
  description: string | null;
};

export async function listParishes(): Promise<Parish[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parishes")
    .select("id, slug, name, address, city, description")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Parish[];
}

export async function getParishBySlug(slug: string): Promise<Parish | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parishes")
    .select("id, slug, name, address, city, description")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as Parish | null) ?? null;
}

// =====================================================================
// Festividad / novedades del día (CU-07)
// =====================================================================

export type LiturgicalEventToday = {
  name: string;
  slug: string;
  description: string | null;
  kind: string;
  playlist:
    | (PlaylistSummary & { parish_slug: string | null })
    | null;
};

export async function getEventForToday(): Promise<LiturgicalEventToday | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("liturgical_events")
    .select(
      "name, slug, description, kind, playlists(id, name, description, event_date, parishes!playlists_parish_id_fkey(name, slug))"
    )
    .eq("event_date", today)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const plRel = data.playlists as
    | { id: string; name: string; description: string | null; event_date: string | null; parishes: ParishRel }
    | { id: string; name: string; description: string | null; event_date: string | null; parishes: ParishRel }[]
    | null;
  const pl = Array.isArray(plRel) ? plRel[0] : plRel;
  const parish = pl ? firstParish(pl.parishes) : null;

  return {
    name: data.name as string,
    slug: data.slug as string,
    description: (data.description as string | null) ?? null,
    kind: data.kind as string,
    playlist: pl
      ? {
          id: pl.id,
          name: pl.name,
          description: pl.description,
          event_date: pl.event_date,
          parish: parish,
          parish_slug: parish?.slug ?? null,
        }
      : null,
  };
}

export type Featured = {
  title: string;
  body: string | null;
  target_kind: string;
  target_id: string | null;
  target_url: string | null;
};

export async function listActiveFeatured(): Promise<Featured[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("featured_content")
    .select("title, body, target_kind, target_id, target_url, starts_at, ends_at, priority")
    .eq("is_active", true)
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("priority", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    title: r.title as string,
    body: (r.body as string | null) ?? null,
    target_kind: r.target_kind as string,
    target_id: (r.target_id as string | null) ?? null,
    target_url: (r.target_url as string | null) ?? null,
  }));
}

export function youtubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname.includes("youtu.be")) {
      id = u.pathname.replace(/^\//, "");
    } else if (u.hostname.includes("youtube.com")) {
      id = u.searchParams.get("v");
    }
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}
