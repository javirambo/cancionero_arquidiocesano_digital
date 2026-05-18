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

function joinAuthors(a: Named, b: Named): string | null {
  const n1 = firstName(a);
  const n2 = firstName(b);
  const parts = [n1, n2].filter((x): x is string => Boolean(x));
  return parts.length === 0 ? null : parts.join(", ");
}

type SongCategoryRel =
  | { categories: { name: string } | { name: string }[] | null }
  | { categories: { name: string } | { name: string }[] | null }[]
  | null;

function categoryNames(rel: SongCategoryRel): string[] {
  if (!rel) return [];
  const arr = Array.isArray(rel) ? rel : [rel];
  const names: string[] = [];
  for (const row of arr) {
    const cat = row.categories;
    if (!cat) continue;
    if (Array.isArray(cat)) {
      for (const c of cat) if (c?.name) names.push(c.name);
    } else if (cat.name) {
      names.push(cat.name);
    }
  }
  return names;
}

export type Song = Omit<SongSummary, "category"> & {
  categories: string[];
  author: string | null;
  body: string;
  original_key: string | null;
  youtube_url: string | null;
  hasFiles: boolean;
};

export type PublicCategoryOption = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export async function listPublicCategories(): Promise<PublicCategoryOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PublicCategoryOption[];
}

async function resolveCategorySongIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categorySlugs: string[]
): Promise<string[]> {
  if (categorySlugs.length === 0) return [];
  const { data: cats, error: catErr } = await supabase
    .from("categories")
    .select("id, slug")
    .in("slug", categorySlugs);
  if (catErr) throw catErr;
  const catRows = (cats ?? []) as { id: string; slug: string }[];
  // AND estricto: si algún slug no existe, no puede haber resultados.
  if (catRows.length !== categorySlugs.length) return [];
  // Para cada categoría, traer el set de song_id e intersectar.
  let intersection: Set<string> | null = null;
  for (const c of catRows) {
    const { data: links, error } = await supabase
      .from("song_categories")
      .select("song_id")
      .eq("category_id", c.id);
    if (error) throw error;
    const ids = new Set(
      ((links ?? []) as { song_id: string }[]).map((l) => l.song_id)
    );
    if (intersection === null) {
      intersection = ids;
    } else {
      const next = new Set<string>();
      for (const id of intersection) if (ids.has(id)) next.add(id);
      intersection = next;
    }
    if (intersection.size === 0) return [];
  }
  return intersection ? Array.from(intersection) : [];
}

export async function listPublishedSongs(limit = 100): Promise<SongSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("songs")
    .select("id, number, title, slug, song_categories(categories(name)), author1:authors!songs_author_id_fkey(name), author2:authors!songs_author2_id_fkey(name)")
    .eq("status", "published")
    .order("number", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const cats = categoryNames(row.song_categories as SongCategoryRel);
    return {
      id: row.id as string,
      number: row.number as number | null,
      title: row.title as string,
      slug: row.slug as string,
      category: cats.length > 0 ? cats.join(", ") : null,
      author: joinAuthors(row.author1 as Named, row.author2 as Named),
    };
  });
}

export async function getSongBySlug(slug: string): Promise<Song | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("songs")
    .select(
      "id, number, title, slug, body, original_key, youtube_url, song_categories(categories(name)), author1:authors!songs_author_id_fkey(name), author2:authors!songs_author2_id_fkey(name), song_files(id)"
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
    categories: categoryNames(data.song_categories as SongCategoryRel),
    author: joinAuthors(data.author1 as Named, data.author2 as Named),
    hasFiles: files.length > 0,
  };
}

// Trae un set acotado de canciones publicadas por sus IDs con todos los campos
// necesarios para renderizar la vista detalle. Conserva el orden de `ids`.
// Usado por el pager de playlist para precargar canciones adyacentes (CU-05).
export async function getSongsByIds(ids: string[]): Promise<Song[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("songs")
    .select(
      "id, number, title, slug, body, original_key, youtube_url, song_categories(categories(name)), author1:authors!songs_author_id_fkey(name), author2:authors!songs_author2_id_fkey(name), song_files(id)"
    )
    .eq("status", "published")
    .in("id", ids);
  if (error) throw error;
  const byId = new Map((data ?? []).map((r) => [r.id as string, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((row): row is NonNullable<typeof row> => row !== undefined)
    .map((row) => {
      const files = (row.song_files as { id: string }[] | null) ?? [];
      return {
        id: row.id as string,
        number: row.number as number | null,
        title: row.title as string,
        slug: row.slug as string,
        body: row.body as string,
        original_key: row.original_key as string | null,
        youtube_url: row.youtube_url as string | null,
        categories: categoryNames(row.song_categories as SongCategoryRel),
        author: joinAuthors(row.author1 as Named, row.author2 as Named),
        hasFiles: files.length > 0,
      };
    });
}

export async function listSongsWithCapabilities(
  q: string = "",
  limit = 100,
  categorySlugs: string[] = []
): Promise<(SongSummary & SongCapabilities)[]> {
  const supabase = await createClient();
  const term = q.trim();

  // Si hay filtro por categorías (AND): resolver intersección de IDs.
  let categoryIds: string[] | null = null;
  if (categorySlugs.length > 0) {
    categoryIds = await resolveCategorySongIds(supabase, categorySlugs);
    if (categoryIds.length === 0) return [];
  }

  // Si hay query: usamos el RPC accent-insensitive para obtener IDs y luego
  // fetcheamos capacidades. Si no, traemos todo el catálogo directo.
  if (term) {
    const { data: matches, error: rpcErr } = await supabase.rpc("search_songs", {
      q: term,
      lim: limit,
    });
    if (rpcErr) throw rpcErr;
    let ids = ((matches ?? []) as { id: string }[]).map((r) => r.id);
    if (categoryIds) {
      const allowed = new Set(categoryIds);
      ids = ids.filter((id) => allowed.has(id));
    }
    if (ids.length === 0) return [];
    const { data: rows, error } = await supabase
      .from("songs")
      .select(
        "id, number, title, slug, body, youtube_url, song_categories(categories(name)), author1:authors!songs_author_id_fkey(name), author2:authors!songs_author2_id_fkey(name), song_files(id)"
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
        const cats = categoryNames(row.song_categories as SongCategoryRel);
        return {
          id: row.id as string,
          number: row.number as number | null,
          title: row.title as string,
          slug: row.slug as string,
          category: cats.length > 0 ? cats.join(", ") : null,
          author: joinAuthors(row.author1 as Named, row.author2 as Named),
          hasChords: /\[[^\]]+\]/.test(body),
          hasYoutube: Boolean(row.youtube_url),
          hasFiles: files.length > 0,
        };
      });
  }

  // Sin query: catálogo completo ordenado por número.
  let baseQuery = supabase
    .from("songs")
    .select(
      "id, number, title, slug, body, youtube_url, song_categories(categories(name)), author1:authors!songs_author_id_fkey(name), author2:authors!songs_author2_id_fkey(name), song_files(id)"
    )
    .eq("status", "published");
  if (categoryIds) {
    baseQuery = baseQuery.in("id", categoryIds);
  }
  const { data, error } = await baseQuery
    .order("number", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const body = (row.body as string | null) ?? "";
    const files = (row.song_files as { id: string }[] | null) ?? [];
    const cats = categoryNames(row.song_categories as SongCategoryRel);
    return {
      id: row.id as string,
      number: row.number as number | null,
      title: row.title as string,
      slug: row.slug as string,
      category: cats.length > 0 ? cats.join(", ") : null,
      author: joinAuthors(row.author1 as Named, row.author2 as Named),
      hasChords: /\[[^\]]+\]/.test(body),
      hasYoutube: Boolean(row.youtube_url),
      hasFiles: files.length > 0,
    };
  });
}

export async function listSongsPaged(
  page: number,
  pageSize: number,
  categorySlugs: string[] = []
): Promise<{ items: (SongSummary & SongCapabilities)[]; total: number }> {
  const supabase = await createClient();
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  let categoryIds: string[] | null = null;
  if (categorySlugs.length > 0) {
    categoryIds = await resolveCategorySongIds(supabase, categorySlugs);
    if (categoryIds.length === 0) return { items: [], total: 0 };
  }

  let pagedQuery = supabase
    .from("songs")
    .select(
      "id, number, title, slug, body, youtube_url, song_categories(categories(name)), author1:authors!songs_author_id_fkey(name), author2:authors!songs_author2_id_fkey(name), song_files(id)",
      { count: "exact" }
    )
    .eq("status", "published");
  if (categoryIds) {
    pagedQuery = pagedQuery.in("id", categoryIds);
  }
  const { data, error, count } = await pagedQuery
    .order("number", { ascending: true, nullsFirst: false })
    .range(from, to);
  if (error) throw error;
  const items = (data ?? []).map((row) => {
    const body = (row.body as string | null) ?? "";
    const files = (row.song_files as { id: string }[] | null) ?? [];
    const cats = categoryNames(row.song_categories as SongCategoryRel);
    return {
      id: row.id as string,
      number: row.number as number | null,
      title: row.title as string,
      slug: row.slug as string,
      category: cats.length > 0 ? cats.join(", ") : null,
      author: joinAuthors(row.author1 as Named, row.author2 as Named),
      hasChords: /\[[^\]]+\]/.test(body),
      hasYoutube: Boolean(row.youtube_url),
      hasFiles: files.length > 0,
    };
  });
  return { items, total: count ?? 0 };
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
    playlists: visiblePlaylists.map((p) => ({ ...p, image_path: null })),
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
  image_path: string | null;
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
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ParishStatus;
  decanato: string | null;
  parent_id: string | null;
  url: string | null;
  parent: { name: string } | null;
};

const PARISH_SELECT =
  "id, slug, name, address, city, phone, email, logo_url, description, latitude, longitude, status, decanato, parent_id, url, parent:parent_id(name)";

export async function listParishes(): Promise<Parish[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parishes")
    .select(PARISH_SELECT)
    .eq("status", "active")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizeParish);
}

export async function getParishBySlug(slug: string): Promise<Parish | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parishes")
    .select(PARISH_SELECT)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeParish(data) : null;
}

function normalizeParish(row: Record<string, unknown>): Parish {
  const rel = row.parent as { name: string } | { name: string }[] | null;
  const parent = Array.isArray(rel) ? (rel[0] ?? null) : rel;
  return { ...(row as Omit<Parish, "parent">), parent } as Parish;
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
export async function getEventForToday(
  audience?: "home"
): Promise<LiturgicalEventToday | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, kind, target_kind, target_id, target_url, priority")
    .not("kind", "is", null)
    .order("priority", { ascending: false });
  if (error) throw error;
  const allRows = (data ?? []) as Array<{ id: string } & Record<string, unknown>>;
  if (allRows.length === 0) return null;
  const rows = await filterAnnouncementsByAudience(allRows, audience);
  if (rows.length === 0) return null;

  const ids = rows.map((r) => r.id);
  const sched = await loadSchedules("announcement", ids);
  const vigente = rows.find((r) =>
    isVisibleNow(sched.get(r.id))
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
  kind: string | null;
  target_kind: string;
  target_id: string | null;
  target_url: string | null;
  image_path: string | null;
  featured: boolean;
  // URL ya resuelta a la que debe navegar el banner si es clickeable.
  // Null cuando target_kind === 'none' o no se pudo resolver.
  href: string | null;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string | null;
  kind: string | null;
  target_kind: string;
  target_id: string | null;
  target_url: string | null;
  image_path: string | null;
  priority: number;
  featured: boolean;
  created_at: string;
};

async function resolveAnnouncementHrefs(
  rows: AnnouncementRow[]
): Promise<Featured[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const songIds: string[] = [];
  const parishIds: string[] = [];
  for (const r of rows) {
    if (!r.target_id) continue;
    if (r.target_kind === "song") songIds.push(r.target_id);
    else if (r.target_kind === "parish") parishIds.push(r.target_id);
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
    let href: string | null = null;
    if (r.target_kind === "song" && r.target_id) {
      const slug = songSlugById.get(r.target_id);
      if (slug) href = `/canciones/${slug}`;
    } else if (r.target_kind === "playlist" && r.target_id) {
      href = `/playlists/${r.target_id}`;
    } else if (r.target_kind === "parish" && r.target_id) {
      const slug = parishSlugById.get(r.target_id);
      if (slug) href = `/parroquias/${slug}`;
    } else if (r.target_kind === "external" && r.target_url) {
      href = r.target_url;
    } else if (r.target_kind === "document") {
      href = `/anuncios/${r.id}`;
    }
    return {
      title: r.title,
      body: r.body,
      kind: r.kind,
      target_kind: r.target_kind,
      target_id: r.target_id,
      target_url: r.target_url,
      image_path: r.image_path,
      featured: r.featured,
      href,
    };
  });
}

// Parroquias asociadas al usuario actual (principal en users.parish_id +
// asociadas vía parish_members). Devuelve set vacío si no hay sesión.
async function getCurrentUserParishIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();
  const [profileRes, membersRes] = await Promise.all([
    supabase.from("users").select("parish_id").eq("id", user.id).maybeSingle(),
    supabase.from("parish_members").select("parish_id").eq("user_id", user.id),
  ]);
  const ids = new Set<string>();
  const primary = (profileRes.data?.parish_id as string | null) ?? null;
  if (primary) ids.add(primary);
  for (const m of membersRes.data ?? []) {
    if (m.parish_id) ids.add(m.parish_id as string);
  }
  return ids;
}

// Filtra anuncios según la audiencia.
// - "home": invitado solo ve globales (sin filas en announcement_parishes);
//   member ve globales + scoped a sus parroquias.
// - undefined: pass-through (todas las filas, RLS ya decide).
async function filterAnnouncementsByAudience<T extends { id: string }>(
  rows: T[],
  audience?: "home"
): Promise<T[]> {
  if (rows.length === 0 || audience !== "home") return rows;
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("announcement_parishes")
    .select("announcement_id, parish_id")
    .in("announcement_id", rows.map((r) => r.id));
  const byAnn = new Map<string, Set<string>>();
  for (const l of links ?? []) {
    const annId = l.announcement_id as string;
    const parId = l.parish_id as string;
    if (!byAnn.has(annId)) byAnn.set(annId, new Set());
    byAnn.get(annId)!.add(parId);
  }
  const userParishes = await getCurrentUserParishIds();
  return rows.filter((r) => {
    const scoped = byAnn.get(r.id);
    if (!scoped || scoped.size === 0) return true; // global
    for (const p of scoped) if (userParishes.has(p)) return true;
    return false;
  });
}

async function listAnnouncementsByKindFilter(
  kindFilter: "null" | "not-null" | { eq: string },
  limit?: number,
  audience?: "home"
): Promise<{ items: Featured[]; total: number }> {
  const supabase = await createClient();
  let query = supabase
    .from("announcements")
    .select("id, title, body, kind, target_kind, target_id, target_url, image_path, priority, featured, created_at")
    .order("created_at", { ascending: false });
  if (kindFilter === "null") query = query.is("kind", null);
  else if (kindFilter === "not-null") query = query.not("kind", "is", null);
  else query = query.eq("kind", kindFilter.eq);
  const { data, error } = await query;
  if (error) throw error;
  const all = (data ?? []) as AnnouncementRow[];
  const byAudience = await filterAnnouncementsByAudience(all, audience);
  const sched = await loadSchedules("announcement", byAudience.map((r) => r.id));
  const visibles = byAudience.filter((r) => isVisibleNow(sched.get(r.id)));
  const rows = limit ? visibles.slice(0, limit) : visibles;
  const items = await resolveAnnouncementHrefs(rows);
  return { items, total: visibles.length };
}

export async function listCommonAnnouncements(
  limit?: number,
  audience?: "home"
): Promise<{ items: Featured[]; total: number }> {
  return listAnnouncementsByKindFilter("null", limit, audience);
}

export async function listLiturgicalAnnouncements(
  limit?: number,
  audience?: "home"
): Promise<{ items: Featured[]; total: number }> {
  return listAnnouncementsByKindFilter("not-null", limit, audience);
}

export async function listAnnouncementsByKind(
  kind: string,
  limit?: number,
  audience?: "home"
): Promise<{ items: Featured[]; total: number }> {
  return listAnnouncementsByKindFilter({ eq: kind }, limit, audience);
}

// Anuncios vinculados específicamente a una parroquia (excluye globales).
// Filtra por vigencia horaria (isVisibleNow). Mezcla comunes y litúrgicos.
export async function listAnnouncementsForParish(
  parishId: string,
  limit?: number
): Promise<{ items: Featured[]; total: number }> {
  const supabase = await createClient();
  const { data: links, error: linkErr } = await supabase
    .from("announcement_parishes")
    .select("announcement_id")
    .eq("parish_id", parishId);
  if (linkErr) throw linkErr;
  const ids = (links ?? []).map((l) => l.announcement_id as string);
  if (ids.length === 0) return { items: [], total: 0 };
  const { data, error } = await supabase
    .from("announcements")
    .select(
      "id, title, body, kind, target_kind, target_id, target_url, image_path, priority, featured, created_at"
    )
    .in("id", ids)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const all = (data ?? []) as AnnouncementRow[];
  const sched = await loadSchedules("announcement", all.map((r) => r.id));
  const visibles = all.filter((r) => isVisibleNow(sched.get(r.id)));
  const rows = limit ? visibles.slice(0, limit) : visibles;
  const items = await resolveAnnouncementHrefs(rows);
  return { items, total: visibles.length };
}

// Devuelve el anuncio destacado (featured = true) de mayor prioridad que el
// usuario debería ver en la Home. Aplica filtros de parroquia y vigencia.
export async function loadFeaturedAnnouncementPopup(): Promise<Featured | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select(
      "id, title, body, kind, target_kind, target_id, target_url, image_path, priority, featured, created_at"
    )
    .eq("featured", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const all = (data ?? []) as AnnouncementRow[];
  if (all.length === 0) return null;
  const byAudience = await filterAnnouncementsByAudience(all, "home");
  const sched = await loadSchedules("announcement", byAudience.map((r) => r.id));
  const visibles = byAudience.filter((r) => isVisibleNow(sched.get(r.id)));
  if (visibles.length === 0) return null;
  const items = await resolveAnnouncementHrefs(visibles.slice(0, 1));
  return items[0] ?? null;
}

// Compat: la home anterior llamaba listActiveFeatured (5 items, kind null).
export async function listActiveFeatured(): Promise<Featured[]> {
  const { items } = await listCommonAnnouncements(5);
  return items;
}

export function youtubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("open.spotify.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const validKinds = ["track", "episode", "album", "playlist", "show"];
      const kindIdx = parts.findIndex((p) => validKinds.includes(p));
      if (kindIdx >= 0 && parts[kindIdx + 1]) {
        return `https://open.spotify.com/embed/${parts[kindIdx]}/${parts[kindIdx + 1]}`;
      }
      return null;
    }
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
