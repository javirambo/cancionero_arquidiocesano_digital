import { createClient } from "@/lib/supabase/server";
import type { SongSummary, SongCapabilities } from "@/lib/songs";
import { isVisibleNow } from "@/lib/schedule";
import { loadSchedules } from "@/lib/schedule.server";

export type PlaylistSummary = {
  id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  visibility: "public" | "unlisted" | "private";
  is_archdiocesan: boolean;
  sort_order: number;
  parish: { id: string; name: string; slug: string } | null;
};

export type PlaylistWithSongs = PlaylistSummary & {
  songs: (SongSummary & SongCapabilities & {
    position: number;
    created_at: string;
    original_key: string | null;
    key_override: string | null;
    body: string;
    status: string;
  })[];
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

type ParishRel =
  | { id: string; name: string; slug: string }
  | { id: string; name: string; slug: string }[]
  | null;
function firstParish(
  rel: ParishRel
): { id: string; name: string; slug: string } | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel;
}

const PLAYLIST_SELECT =
  "id, name, description, image_path, visibility, is_archdiocesan, sort_order, parishes!playlists_parish_id_fkey(id, name, slug)";

function rowToSummary(row: {
  id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  visibility: string;
  is_archdiocesan: boolean;
  sort_order: number;
  parishes: ParishRel;
}): PlaylistSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    image_path: row.image_path,
    visibility: row.visibility as PlaylistSummary["visibility"],
    is_archdiocesan: row.is_archdiocesan,
    sort_order: row.sort_order,
    parish: firstParish(row.parishes),
  };
}

// Filtra una lista de playlists por vigencia temporal (CU-17). Las
// playlists sin schedules quedan visibles siempre.
async function filterByScheduleVisibility<T extends { id: string }>(
  items: T[]
): Promise<T[]> {
  if (items.length === 0) return items;
  const sched = await loadSchedules("playlist", items.map((i) => i.id));
  return items.filter((i) => isVisibleNow(sched.get(i.id)));
}

// Devuelve las playlists asociadas a una parroquia: propias + suscriptas +
// (si la parroquia no es la Arquidiócesis) las archidiocesanas.
// Cada item viene marcado con `relation` para mostrar la procedencia.
export type ParishPlaylistRelation = "own" | "subscribed" | "archdiocesan";
export type ParishPlaylistItem = PlaylistSummary & {
  relation: ParishPlaylistRelation;
};

// Listado global de playlists públicas (incluye archidiocesanas y de cada
// parroquia). No incluye `unlisted`/`private`.
export async function listAllPublicPlaylists(options?: {
  includeOutOfWindow?: boolean;
}): Promise<PlaylistSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .eq("visibility", "public")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const all = (data ?? []).map((r) =>
    rowToSummary(r as unknown as Parameters<typeof rowToSummary>[0])
  );
  return options?.includeOutOfWindow ? all : await filterByScheduleVisibility(all);
}

// Secciones para `/playlists` (CU-17): personales privadas del usuario,
// playlists de las parroquias donde es miembro, y arquidiocesanas globales.
// Se aplica dedupe por id con prioridad: personal > parroquia > arquidiocesana.
export type MyPlaylistsSections = {
  personal: PlaylistSummary[];
  byParish: {
    parish: { id: string; slug: string; name: string };
    items: ParishPlaylistItem[];
  }[];
  archdiocesan: PlaylistSummary[];
};

// Listado de playlists arquidiocesanas (para invitados en /playlists).
export async function listArchdiocesanPlaylists(options?: {
  includeOutOfWindow?: boolean;
  limit?: number;
}): Promise<PlaylistSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .eq("is_archdiocesan", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const all = (data ?? []).map((r) =>
    rowToSummary(r as unknown as Parameters<typeof rowToSummary>[0])
  );
  const filtered = options?.includeOutOfWindow ? all : await filterByScheduleVisibility(all);
  return options?.limit ? filtered.slice(0, options.limit) : filtered;
}

export async function listMyPlaylistsSections(
  userId: string,
  options?: { includeOutOfWindow?: boolean }
): Promise<MyPlaylistsSections> {
  const supabase = await createClient();

  // 1. Personales del usuario (parish_id IS NULL y created_by = user).
  const personalReq = supabase
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .is("parish_id", null)
    .eq("created_by", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  // 2. Parroquias donde el usuario es miembro.
  const membersReq = supabase
    .from("parish_members")
    .select("parish_id, parishes(id, slug, name)")
    .eq("user_id", userId);

  const [personalRes, membersRes] = await Promise.all([personalReq, membersReq]);
  if (personalRes.error) throw personalRes.error;
  if (membersRes.error) throw membersRes.error;

  type ParishRow = { id: string; slug: string; name: string };
  const parishes = (membersRes.data ?? [])
    .map((m) => {
      const rel = m.parishes as ParishRow | ParishRow[] | null;
      return Array.isArray(rel) ? rel[0] : rel;
    })
    .filter((p): p is ParishRow => Boolean(p));

  type Row = Parameters<typeof rowToSummary>[0];
  const personal = (personalRes.data ?? []).map((r) =>
    rowToSummary(r as unknown as Row)
  );

  // Conjunto para dedupe.
  const seen = new Set<string>(personal.map((p) => p.id));

  // 3. Por parroquia: own + subscribed (sin arquidiocesanas — esas van a su sección).
  const byParish: MyPlaylistsSections["byParish"] = [];
  for (const par of parishes) {
    const isArchdiocesisItself = par.slug === "arquidiocesis";

    const ownReq = supabase
      .from("playlists")
      .select(PLAYLIST_SELECT)
      .eq("parish_id", par.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    const subsReq = supabase
      .from("playlist_parish_subscriptions")
      .select(`playlist_id, playlists(${PLAYLIST_SELECT})`)
      .eq("parish_id", par.id);

    const [ownRes, subsRes] = await Promise.all([ownReq, subsReq]);
    if (ownRes.error) throw ownRes.error;
    if (subsRes.error) throw subsRes.error;

    const own = (ownRes.data ?? []).map((r) => ({
      ...rowToSummary(r as unknown as Row),
      relation: "own" as ParishPlaylistRelation,
    }));

    const subsRaw = (subsRes.data ?? []) as Array<{
      playlists: Row | Row[] | null;
    }>;
    const subs = subsRaw
      .map((s) => {
        const pl = Array.isArray(s.playlists) ? s.playlists[0] : s.playlists;
        if (!pl) return null;
        return {
          ...rowToSummary(pl),
          relation: "subscribed" as ParishPlaylistRelation,
        };
      })
      .filter((p): p is ParishPlaylistItem => p !== null);

    // Si la parroquia es la propia "arquidiocesis", sus playlists van a la
    // sección arquidiocesana, no acá.
    const items = isArchdiocesisItself
      ? []
      : [...own, ...subs].filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });

    if (items.length > 0) {
      byParish.push({ parish: par, items });
    }
  }

  // 4. Arquidiocesanas globales (sin las ya vistas).
  const { data: archRows, error: archErr } = await supabase
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .eq("is_archdiocesan", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (archErr) throw archErr;

  const archdiocesan = (archRows ?? [])
    .map((r) => rowToSummary(r as unknown as Row))
    .filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

  if (options?.includeOutOfWindow) {
    return { personal, byParish, archdiocesan };
  }
  // Filtro de vigencia: una sola consulta batch para todos los ids.
  const allIds = [
    ...personal.map((p) => p.id),
    ...byParish.flatMap((g) => g.items.map((i) => i.id)),
    ...archdiocesan.map((a) => a.id),
  ];
  const sched = await loadSchedules("playlist", allIds);
  const visible = (id: string) => isVisibleNow(sched.get(id));
  return {
    personal: personal.filter((p) => visible(p.id)),
    byParish: byParish
      .map((g) => ({ ...g, items: g.items.filter((i) => visible(i.id)) }))
      .filter((g) => g.items.length > 0),
    archdiocesan: archdiocesan.filter((a) => visible(a.id)),
  };
}

export async function listPlaylistsForParish(parishId: string, options?: {
  parishSlug?: string;
  includeOutOfWindow?: boolean;
  excludeArchdiocesan?: boolean;
  limit?: number;
}): Promise<ParishPlaylistItem[]> {
  const supabase = await createClient();
  const isArchdiocesisItself = options?.parishSlug === "arquidiocesis";

  // 1. Propias. Si excludeArchdiocesan está activo, también filtramos las
  // archidiocesanas de la propia parroquia (van a su sección global).
  const ownBase = supabase
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .eq("parish_id", parishId);
  const ownReq = (
    options?.excludeArchdiocesan ? ownBase.eq("is_archdiocesan", false) : ownBase
  ).order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  // 2. Suscriptas (excluye las propias por seguridad).
  const subsReq = supabase
    .from("playlist_parish_subscriptions")
    .select(`playlist_id, playlists(${PLAYLIST_SELECT})`)
    .eq("parish_id", parishId);

  // 3. Archidiocesanas (solo si no somos la propia Arquidiócesis).
  const archReq = isArchdiocesisItself || options?.excludeArchdiocesan
    ? Promise.resolve({ data: [], error: null })
    : supabase
        .from("playlists")
        .select(PLAYLIST_SELECT)
        .eq("is_archdiocesan", true)
        .neq("parish_id", parishId)
        .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

  const [ownRes, subsRes, archRes] = await Promise.all([ownReq, subsReq, archReq]);
  if (ownRes.error) throw ownRes.error;
  if (subsRes.error) throw subsRes.error;
  if (archRes.error) throw archRes.error;

  type Row = Parameters<typeof rowToSummary>[0];

  const own = (ownRes.data ?? []).map((r) => ({
    ...rowToSummary(r as unknown as Row),
    relation: "own" as ParishPlaylistRelation,
  }));

  const subsRaw = (subsRes.data ?? []) as Array<{
    playlists: Row | Row[] | null;
  }>;
  const subs = subsRaw
    .map((s) => {
      const pl = Array.isArray(s.playlists) ? s.playlists[0] : s.playlists;
      if (!pl) return null;
      const summary = rowToSummary(pl);
      if (options?.excludeArchdiocesan && summary.is_archdiocesan) return null;
      return {
        ...summary,
        relation: "subscribed" as ParishPlaylistRelation,
      };
    })
    .filter((p): p is ParishPlaylistItem => p !== null);

  const arch = (archRes.data ?? []).map((r) => ({
    ...rowToSummary(r as unknown as Row),
    relation: "archdiocesan" as ParishPlaylistRelation,
  }));

  // Dedupe por id (la archdiocesana podría también estar en subs).
  const seen = new Set<string>();
  const out: ParishPlaylistItem[] = [];
  for (const item of [...own, ...subs, ...arch]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  const filtered = options?.includeOutOfWindow ? out : await filterByScheduleVisibility(out);
  return options?.limit ? filtered.slice(0, options.limit) : filtered;
}

// Devuelve una playlist por id con sus canciones ordenadas por position.
export async function getPlaylistById(id: string): Promise<PlaylistWithSongs | null> {
  const supabase = await createClient();
  const { data: pl, error } = await supabase
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!pl) return null;

  const summary = rowToSummary(pl as unknown as Parameters<typeof rowToSummary>[0]);

  const { data: items, error: iErr } = await supabase
    .from("playlist_songs")
    .select(
      "position, created_at, key_override, songs(id, number, title, slug, body, original_key, status, youtube_url, song_categories(categories(name)), author1:authors!songs_author_id_fkey(name), author2:authors!songs_author2_id_fkey(name), song_files(id))"
    )
    .eq("playlist_id", id)
    .order("position", { ascending: true });
  if (iErr) throw iErr;

  type SongCategoryRow = {
    categories: { name: string } | { name: string }[] | null;
  };
  type SongRow = {
    id: string;
    number: number | null;
    title: string;
    slug: string;
    body: string | null;
    original_key: string | null;
    status: string | null;
    youtube_url: string | null;
    song_categories: SongCategoryRow[] | null;
    author1: Named;
    author2: Named;
    song_files: { id: string }[] | null;
  };

  const songs = (items ?? [])
    .map((row) => {
      const songRel = row.songs as SongRow | SongRow[] | null;
      const s = Array.isArray(songRel) ? songRel[0] : songRel;
      if (!s) return null;
      const body = s.body ?? "";
      const files = s.song_files ?? [];
      const cats: string[] = [];
      for (const sc of s.song_categories ?? []) {
        const cat = sc.categories;
        if (!cat) continue;
        if (Array.isArray(cat)) {
          for (const c of cat) if (c?.name) cats.push(c.name);
        } else if (cat.name) {
          cats.push(cat.name);
        }
      }
      return {
        id: s.id,
        number: s.number,
        title: s.title,
        slug: s.slug,
        category: cats.length > 0 ? cats.join(", ") : null,
        author: joinAuthors(s.author1, s.author2),
        hasChords: /\[[^\]]+\]/.test(body),
        hasYoutube: Boolean(s.youtube_url),
        hasFiles: files.length > 0,
        position: row.position as number,
        created_at: row.created_at as string,
        original_key: s.original_key,
        key_override: (row as { key_override: string | null }).key_override ?? null,
        body,
        status: s.status ?? "unknown",
      };
    })
    .filter(
      (
        x
      ): x is SongSummary & SongCapabilities & {
        position: number;
        created_at: string;
        original_key: string | null;
        key_override: string | null;
        body: string;
        status: string;
      } =>
        x !== null
    );

  return { ...summary, songs };
}
