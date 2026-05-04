import { createClient } from "@/lib/supabase/server";
import type { SongSummary, SongCapabilities } from "@/lib/songs";

export type PlaylistSummary = {
  id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  visibility: "public" | "unlisted" | "private";
  is_archdiocesan: boolean;
  parish: { id: string; name: string; slug: string } | null;
};

export type PlaylistWithSongs = PlaylistSummary & {
  songs: (SongSummary & SongCapabilities & { position: number; created_at: string })[];
};

type Named = { name: string } | { name: string }[] | null;
function firstName(rel: Named): string | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0]?.name ?? null;
  return rel.name ?? null;
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
  "id, name, description, event_date, visibility, is_archdiocesan, parishes!playlists_parish_id_fkey(id, name, slug)";

function rowToSummary(row: {
  id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  visibility: string;
  is_archdiocesan: boolean;
  parishes: ParishRel;
}): PlaylistSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    event_date: row.event_date,
    visibility: row.visibility as PlaylistSummary["visibility"],
    is_archdiocesan: row.is_archdiocesan,
    parish: firstParish(row.parishes),
  };
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
export async function listAllPublicPlaylists(): Promise<PlaylistSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .eq("visibility", "public")
    .order("event_date", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((r) =>
    rowToSummary(r as unknown as Parameters<typeof rowToSummary>[0])
  );
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
export async function listArchdiocesanPlaylists(): Promise<PlaylistSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .eq("is_archdiocesan", true)
    .order("event_date", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((r) =>
    rowToSummary(r as unknown as Parameters<typeof rowToSummary>[0])
  );
}

export async function listMyPlaylistsSections(
  userId: string
): Promise<MyPlaylistsSections> {
  const supabase = await createClient();

  // 1. Personales del usuario (parish_id IS NULL y created_by = user).
  const personalReq = supabase
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .is("parish_id", null)
    .eq("created_by", userId)
    .order("event_date", { ascending: false, nullsFirst: false });

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
      .order("event_date", { ascending: false, nullsFirst: false });

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
    .order("event_date", { ascending: false, nullsFirst: false });
  if (archErr) throw archErr;

  const archdiocesan = (archRows ?? [])
    .map((r) => rowToSummary(r as unknown as Row))
    .filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

  return { personal, byParish, archdiocesan };
}

export async function listPlaylistsForParish(parishId: string, options?: {
  parishSlug?: string;
}): Promise<ParishPlaylistItem[]> {
  const supabase = await createClient();
  const isArchdiocesisItself = options?.parishSlug === "arquidiocesis";

  // 1. Propias.
  const ownReq = supabase
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .eq("parish_id", parishId)
    .order("event_date", { ascending: false, nullsFirst: false });

  // 2. Suscriptas (excluye las propias por seguridad).
  const subsReq = supabase
    .from("playlist_parish_subscriptions")
    .select(`playlist_id, playlists(${PLAYLIST_SELECT})`)
    .eq("parish_id", parishId);

  // 3. Archidiocesanas (solo si no somos la propia Arquidiócesis).
  const archReq = isArchdiocesisItself
    ? Promise.resolve({ data: [], error: null })
    : supabase
        .from("playlists")
        .select(PLAYLIST_SELECT)
        .eq("is_archdiocesan", true)
        .neq("parish_id", parishId)
        .order("event_date", { ascending: false, nullsFirst: false });

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
      return {
        ...rowToSummary(pl),
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
  return out;
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
      "position, created_at, songs(id, number, title, slug, body, youtube_url, categories(name), authors(name), song_files(status))"
    )
    .eq("playlist_id", id)
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
      (
        x
      ): x is SongSummary & SongCapabilities & { position: number; created_at: string } =>
        x !== null
    );

  return { ...summary, songs };
}
