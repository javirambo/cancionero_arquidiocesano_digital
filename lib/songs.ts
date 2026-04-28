import { createClient } from "@/lib/supabase/server";

export type SongSummary = {
  id: string;
  number: number | null;
  title: string;
  slug: string;
  category: string | null;
  author: string | null;
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

export async function searchSongs(q: string, limit = 50): Promise<SongSummary[]> {
  const supabase = await createClient();
  const term = q.trim();
  if (!term) return listPublishedSongs(limit);
  const { data, error } = await supabase
    .from("songs")
    .select("id, number, title, slug, categories(name), authors(name)")
    .eq("status", "published")
    .or(`title.ilike.%${term}%,body.ilike.%${term}%`)
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
  songs: (SongSummary & { position: number })[];
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
      "position, songs(id, number, title, slug, categories(name), authors(name))"
    )
    .eq("playlist_id", pl.id)
    .order("position", { ascending: true });
  if (iErr) throw iErr;

  const songs = (items ?? [])
    .map((row) => {
      const songRel = row.songs as
        | { id: string; number: number | null; title: string; slug: string; categories: Named; authors: Named }
        | { id: string; number: number | null; title: string; slug: string; categories: Named; authors: Named }[]
        | null;
      const s = Array.isArray(songRel) ? songRel[0] : songRel;
      if (!s) return null;
      return {
        id: s.id,
        number: s.number,
        title: s.title,
        slug: s.slug,
        category: firstName(s.categories),
        author: firstName(s.authors),
        position: row.position as number,
      };
    })
    .filter((x): x is SongSummary & { position: number } => x !== null);

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
