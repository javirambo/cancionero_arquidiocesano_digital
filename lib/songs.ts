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

// Devuelve canciones publicadas con sus capacidades para badges (CU-23).
// Si `q` está vacío, devuelve el catálogo completo.
// Si `term` es solo dígitos, devuelve el entero (sin ceros a la izquierda).
// Ej: "2" → 2, "002" → 2, "abc" → null, "12a" → null.
function parseSongNumber(term: string): number | null {
  if (!/^\d+$/.test(term)) return null;
  const n = Number.parseInt(term, 10);
  return Number.isFinite(n) ? n : null;
}

// Construye la cláusula OR para Supabase combinando match por número
// (si aplica) y match por título/letra.
function buildSongMatchOr(term: string): string {
  const like = `%${term}%`;
  const num = parseSongNumber(term);
  const parts = [`title.ilike.${like}`, `body.ilike.${like}`];
  if (num !== null) parts.unshift(`number.eq.${num}`);
  return parts.join(",");
}

export async function listSongsWithCapabilities(
  q: string = "",
  limit = 100
): Promise<(SongSummary & SongCapabilities)[]> {
  const supabase = await createClient();
  const term = q.trim();
  let query = supabase
    .from("songs")
    .select(
      "id, number, title, slug, body, youtube_url, categories(name), authors(name), song_files(id, status)"
    )
    .eq("status", "published")
    .order("number", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (term) {
    query = query.or(buildSongMatchOr(term));
  }
  const { data, error } = await query;
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
  const { data, error } = await supabase
    .from("songs")
    .select("id, number, title, slug, categories(name), authors(name)")
    .eq("status", "published")
    .or(buildSongMatchOr(term))
    .order("number", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    number: row.number as number | null,
    title: row.title as string,
    slug: row.slug as string,
    category: firstName(row.categories as Named),
    author: firstName(row.authors as Named),
  }));
}

export type GlobalSearchResults = {
  songs: SongSummary[];
  playlists: PlaylistSummary[];
  parishes: Parish[];
};

export async function searchGlobal(q: string, limit = 8): Promise<GlobalSearchResults> {
  const term = q.trim();
  if (!term) return { songs: [], playlists: [], parishes: [] };
  const supabase = await createClient();
  const like = `%${term}%`;

  const [songsRes, playlistsRes, parishesRes] = await Promise.all([
    supabase
      .from("songs")
      .select("id, number, title, slug, categories(name), authors(name)")
      .eq("status", "published")
      .or(buildSongMatchOr(term))
      .limit(limit),
    supabase
      .from("playlists")
      .select("id, slug, name, description, event_date, parishes(name, slug)")
      .eq("visibility", "public")
      .ilike("name", like)
      .limit(limit),
    supabase
      .from("parishes")
      .select("id, slug, name, address, city, description")
      .eq("is_active", true)
      .or(`name.ilike.${like},city.ilike.${like}`)
      .limit(limit),
  ]);

  if (songsRes.error) throw songsRes.error;
  if (playlistsRes.error) throw playlistsRes.error;
  if (parishesRes.error) throw parishesRes.error;

  return {
    songs: (songsRes.data ?? []).map((row) => ({
      id: row.id as string,
      number: row.number as number | null,
      title: row.title as string,
      slug: row.slug as string,
      category: firstName(row.categories as Named),
      author: firstName(row.authors as Named),
    })),
    playlists: (playlistsRes.data ?? []).map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      event_date: (row.event_date as string | null) ?? null,
      parish: firstParish(row.parishes as ParishRel),
    })),
    parishes: (parishesRes.data ?? []) as Parish[],
  };
}

// =====================================================================
// Playlists
// =====================================================================

export type PlaylistSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  event_date: string | null;
  parish: { name: string; slug: string } | null;
};

export type PlaylistWithSongs = PlaylistSummary & {
  songs: (SongSummary & SongCapabilities & { position: number; created_at: string })[];
};

type ParishRel = { name: string; slug: string } | { name: string; slug: string }[] | null;
function firstParish(rel: ParishRel): { name: string; slug: string } | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel;
}

export async function listPlaylists(parishSlug?: string): Promise<PlaylistSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("playlists")
    .select("id, slug, name, description, event_date, parishes(name, slug)")
    .eq("visibility", "public")
    .order("event_date", { ascending: false, nullsFirst: false });
  if (parishSlug) {
    // Filtro por slug de parroquia (relación 1-N).
    query = query.eq("parishes.slug", parishSlug);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? [])
    .map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      event_date: (row.event_date as string | null) ?? null,
      parish: firstParish(row.parishes as ParishRel),
    }))
    // Si filtramos por parroquia, descartamos rows sin match de la relación.
    .filter((p) => (parishSlug ? p.parish?.slug === parishSlug : true));
}

export async function getPlaylistBySlug(
  parishSlug: string,
  playlistSlug: string
): Promise<PlaylistWithSongs | null> {
  const supabase = await createClient();
  // Primero la parroquia (para obtener parish_id sin ambiguedad).
  const { data: parish, error: pErr } = await supabase
    .from("parishes")
    .select("id, name, slug")
    .eq("slug", parishSlug)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!parish) return null;

  const { data: pl, error: plErr } = await supabase
    .from("playlists")
    .select("id, slug, name, description, event_date")
    .eq("parish_id", parish.id)
    .eq("slug", playlistSlug)
    .maybeSingle();
  if (plErr) throw plErr;
  if (!pl) return null;

  const { data: items, error: iErr } = await supabase
    .from("playlist_songs")
    .select(
      "position, created_at, songs(id, number, title, slug, body, youtube_url, categories(name), authors(name), song_files(status))"
    )
    .eq("playlist_id", pl.id)
    .order("position", { ascending: true });
  if (iErr) throw iErr;

  type SongRow = {
    id: string;
    number: number | null;
    title: string;
    slug: string;
    body: string | null;
    youtube_url: string | null;
    categories: Named;
    authors: Named;
    song_files: { status: string }[] | null;
  };

  const songs = (items ?? [])
    .map((row) => {
      const songRel = row.songs as SongRow | SongRow[] | null;
      const s = Array.isArray(songRel) ? songRel[0] : songRel;
      if (!s) return null;
      const body = s.body ?? "";
      const files = s.song_files ?? [];
      return {
        id: s.id,
        number: s.number,
        title: s.title,
        slug: s.slug,
        category: firstName(s.categories),
        author: firstName(s.authors),
        hasChords: /\[[^\]]+\]/.test(body),
        hasYoutube: Boolean(s.youtube_url),
        hasFiles: files.some((f) => f.status === "published"),
        position: row.position as number,
        created_at: row.created_at as string,
      };
    })
    .filter(
      (x): x is SongSummary & SongCapabilities & { position: number; created_at: string } =>
        x !== null
    );

  return {
    id: pl.id as string,
    slug: pl.slug as string,
    name: pl.name as string,
    description: (pl.description as string | null) ?? null,
    event_date: (pl.event_date as string | null) ?? null,
    parish: { name: parish.name as string, slug: parish.slug as string },
    songs,
  };
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
      "name, slug, description, kind, playlists(id, slug, name, description, event_date, parishes(name, slug))"
    )
    .eq("event_date", today)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const plRel = data.playlists as
    | { id: string; slug: string; name: string; description: string | null; event_date: string | null; parishes: ParishRel }
    | { id: string; slug: string; name: string; description: string | null; event_date: string | null; parishes: ParishRel }[]
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
          slug: pl.slug,
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
