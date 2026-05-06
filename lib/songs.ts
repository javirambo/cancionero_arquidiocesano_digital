import { createClient } from "@/lib/supabase/server";
import { isVisibleNow } from "@/lib/schedule";
import { loadSchedules } from "@/lib/schedule.server";

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
  hasFiles: boolean;
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
      "id, number, title, slug, body, original_key, youtube_url, categories(name), authors(name), song_files(id)"
    )
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const files = (data.song_files as { id: string }[] | null) ?? [];
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
    hasFiles: files.length > 0,
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
        "id, number, title, slug, body, youtube_url, categories(name), authors(name), song_files(id)"
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
        const files = (row.song_files as { id: string }[] | null) ?? [];
        return {
          id: row.id as string,
          number: row.number as number | null,
          title: row.title as string,
          slug: row.slug as string,
          category: firstName(row.categories as Named),
          author: firstName(row.authors as Named),
          hasChords: /\[[^\]]+\]/.test(body),
          hasYoutube: Boolean(row.youtube_url),
          hasFiles: files.length > 0,
        };
      });
  }

  // Sin query: catálogo completo ordenado por número.
  const { data, error } = await supabase
    .from("songs")
    .select(
      "id, number, title, slug, body, youtube_url, categories(name), authors(name), song_files(id)"
    )
    .eq("status", "published")
    .order("number", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const body = (row.body as string | null) ?? "";
    const files = (row.song_files as { id: string }[] | null) ?? [];
    return {
      id: row.id as string,
      number: row.number as number | null,
      title: row.title as string,
      slug: row.slug as string,
      category: firstName(row.categories as Named),
      author: firstName(row.authors as Named),
      hasChords: /\[[^\]]+\]/.test(body),
      hasYoutube: Boolean(row.youtube_url),
      hasFiles: files.length > 0,
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
      parish: { name: string; slug: string } | null;
    }[];
    parishes: Parish[];
  };
  const r = data as RpcResult;
  const playlists = r.playlists ?? [];
  // Filtrar por vigencia (CU-17 vigencia temporal). Las playlists sin
  // schedules quedan visibles siempre.
  const ids = playlists.map((p) => p.id);
  const sched = await loadSchedules("playlist", ids);
  const visiblePlaylists = playlists.filter((p) =>
    isVisibleNow(sched.get(p.id))
  );
  return {
    songs: r.songs ?? [],
    playlists: visiblePlaylists,
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
  parish: { name: string; slug: string } | null;
};

// =====================================================================
// Parroquias
// =====================================================================

export type ParishStatus = "active" | "pending" | "inactive";

export type Parish = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  city: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ParishStatus;
};

export async function listParishes(): Promise<Parish[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parishes")
    .select("id, slug, name, address, city, description, latitude, longitude, status")
    .eq("status", "active")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Parish[];
}

export async function getParishBySlug(slug: string): Promise<Parish | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parishes")
    .select("id, slug, name, address, city, description, latitude, longitude, status")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return (data as Parish | null) ?? null;
}

// =====================================================================
// Festividad / novedades del día (CU-07)
// =====================================================================

export type LiturgicalEventToday = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  href: string | null;
};

// Festividad litúrgica del día: anuncio con `kind` litúrgico y schedule
// vigente ahora. Si hay varios, gana el de mayor priority.
export async function getEventForToday(): Promise<LiturgicalEventToday | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, kind, target_kind, target_id, target_url, priority")
    .not("kind", "is", null)
    .order("priority", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return null;

  const ids = rows.map((r) => r.id as string);
  const sched = await loadSchedules("announcement", ids);
  const vigente = rows.find((r) =>
    isVisibleNow(sched.get(r.id as string))
  );
  if (!vigente) return null;

  const kind = vigente.target_kind as string;
  const tid = (vigente.target_id as string | null) ?? null;
  const url = (vigente.target_url as string | null) ?? null;
  let href: string | null = null;
  if (kind === "playlist" && tid) href = `/playlists/${tid}`;
  else if (kind === "song" && tid) {
    const { data: s } = await supabase
      .from("songs")
      .select("slug")
      .eq("id", tid)
      .maybeSingle();
    if (s?.slug) href = `/canciones/${s.slug}`;
  } else if (kind === "parish" && tid) {
    const { data: p } = await supabase
      .from("parishes")
      .select("slug")
      .eq("id", tid)
      .maybeSingle();
    if (p?.slug) href = `/parroquias/${p.slug}`;
  } else if (kind === "external" && url) href = url;

  return {
    id: vigente.id as string,
    name: vigente.title as string,
    description: (vigente.body as string | null) ?? null,
    kind: vigente.kind as string,
    href,
  };
}

export type Featured = {
  title: string;
  body: string | null;
  target_kind: string;
  target_id: string | null;
  target_url: string | null;
  // URL ya resuelta a la que debe navegar el banner si es clickeable.
  // Null cuando target_kind === 'none' o no se pudo resolver.
  href: string | null;
};

export async function listActiveFeatured(): Promise<Featured[]> {
  // Lee de `announcements` (CU-07, CU-21). La RLS aplica la regla de
  // visibilidad: anónimo solo globales; autenticado globales + los de
  // sus parroquias asociadas (vía parish_members). La vigencia temporal
  // se evalúa con entity_schedules (ver lib/schedule.ts). Solo anuncios
  // comunes (kind is null); las festividades viven aparte (getEventForToday).
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, target_kind, target_id, target_url, priority")
    .is("kind", null)
    .order("priority", { ascending: false });
  if (error) throw error;
  const all = data ?? [];
  const ids = all.map((r) => r.id as string);
  const sched = await loadSchedules("announcement", ids);
  const rows = all.filter((r) => isVisibleNow(sched.get(r.id as string))).slice(0, 5);

  // Resolver slugs en lote para canciones y parroquias (las playlists
  // usan UUID en URL; las externas ya traen target_url).
  const songIds: string[] = [];
  const parishIds: string[] = [];
  for (const r of rows) {
    const id = r.target_id as string | null;
    if (!id) continue;
    if (r.target_kind === "song") songIds.push(id);
    else if (r.target_kind === "parish") parishIds.push(id);
  }

  const [songSlugs, parishSlugs] = await Promise.all([
    songIds.length > 0
      ? supabase.from("songs").select("id, slug").in("id", songIds)
      : Promise.resolve({ data: [] as { id: string; slug: string }[] }),
    parishIds.length > 0
      ? supabase.from("parishes").select("id, slug").in("id", parishIds)
      : Promise.resolve({ data: [] as { id: string; slug: string }[] }),
  ]);

  const songSlugById = new Map(
    (songSlugs.data ?? []).map((s) => [s.id as string, s.slug as string])
  );
  const parishSlugById = new Map(
    (parishSlugs.data ?? []).map((p) => [p.id as string, p.slug as string])
  );

  return rows.map((r) => {
    const kind = r.target_kind as string;
    const id = (r.target_id as string | null) ?? null;
    const url = (r.target_url as string | null) ?? null;
    let href: string | null = null;
    if (kind === "song" && id) {
      const slug = songSlugById.get(id);
      if (slug) href = `/canciones/${slug}`;
    } else if (kind === "playlist" && id) {
      href = `/playlists/${id}`;
    } else if (kind === "parish" && id) {
      const slug = parishSlugById.get(id);
      if (slug) href = `/parroquias/${slug}`;
    } else if (kind === "external" && url) {
      href = url;
    }
    return {
      title: r.title as string,
      body: (r.body as string | null) ?? null,
      target_kind: kind,
      target_id: id,
      target_url: url,
      href,
    };
  });
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
