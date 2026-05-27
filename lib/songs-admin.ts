import { createClient } from "@/lib/supabase/server";

export type SongStatus =
  | "draft"
  | "review"
  | "published"
  | "archived";

export type AdminSongRow = {
  id: string;
  number: number | null;
  title: string;
  slug: string;
  status: SongStatus;
  category: string | null;
  author: string | null;
  updated_at: string;
  hasChords: boolean;
  hasYoutube: boolean;
  hasFiles: boolean;
};

export type AdminSongDetail = {
  id: string;
  number: number | null;
  title: string;
  slug: string;
  status: SongStatus;
  current_version: number;
  body: string;
  original_key: string | null;
  tempo_bpm: number | null;
  youtube_url: string | null;
  author_id: string | null;
  author2_id: string | null;
  category_ids: string[];
  submitted_at: string | null;
  reviewed_at: string | null;
};

export type AuthorOption = { id: string; name: string };
export type CategoryOption = { id: string; name: string };

export type AdminSongFile = {
  id: string;
  song_id: string;
  kind: "score_pdf" | "audio_mp3" | "audio_ogg" | "other";
  bucket: string;
  path: string;
  label: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type SongVersion = {
  version: number;
  title: string;
  body: string;
  original_key: string | null;
  tempo_bpm: number | null;
  youtube_url: string | null;
  change_summary: string | null;
  published_at: string;
  reviewed_by_name: string | null;
  category_names: string[];
};

export type SongEventKind =
  | "created"
  | "submitted"
  | "withdrawn"
  | "published"
  | "edited"
  | "unpublished"
  | "archived"
  | "unarchived"
  | "restored";

export type SongEvent = {
  id: string;
  event: SongEventKind;
  version: number | null;
  summary: string | null;
  actor_id: string | null;
  actor_name: string | null;
  created_at: string;
};

export type AdminSongsOrden = "modificacion" | "numero" | "nombre";

export async function listSongsForAdmin(
  q: string = "",
  status: SongStatus | "todas" = "todas",
  orden: AdminSongsOrden = "modificacion",
  lim: number = 200
): Promise<AdminSongRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_search_songs", {
    q: q.trim(),
    p_status: status,
    p_orden: orden,
    lim,
  });
  if (error) {
    console.error("[listSongsForAdmin] supabase error", error);
    throw new Error(error.message);
  }
  type Row = {
    id: string;
    number: number | null;
    title: string;
    slug: string;
    status: SongStatus;
    updated_at: string;
    body: string | null;
    youtube_url: string | null;
    has_files: boolean;
    authors: string | null;
    categories: string | null;
  };
  return ((data ?? []) as Row[]).map((row) => {
    const body = row.body ?? "";
    return {
      id: row.id,
      number: row.number,
      title: row.title,
      slug: row.slug,
      status: row.status,
      category: row.categories,
      author: row.authors,
      updated_at: row.updated_at,
      hasChords: /\[[^\]]+\]/.test(body),
      hasYoutube: Boolean(row.youtube_url),
      hasFiles: row.has_files,
    };
  });
}

export type SongStatusCounts = Record<SongStatus, number> & { todas: number };

export async function countSongsByStatus(): Promise<SongStatusCounts> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("songs").select("status");
  if (error) {
    console.error("[countSongsByStatus] supabase error", error);
    throw new Error(error.message);
  }
  const counts: SongStatusCounts = {
    todas: 0,
    draft: 0,
    review: 0,
    published: 0,
    archived: 0,
  };
  for (const row of data ?? []) {
    const status = row.status as SongStatus;
    if (status in counts) counts[status] += 1;
    counts.todas += 1;
  }
  return counts;
}

export async function getSongForAdmin(
  id: string
): Promise<AdminSongDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("songs")
    .select(
      "id, number, title, slug, status, current_version, body, original_key, tempo_bpm, youtube_url, author_id, author2_id, submitted_at, reviewed_at, song_categories(category_id)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const cats = (data.song_categories as { category_id: string }[] | null) ?? [];
  return {
    id: data.id as string,
    number: data.number as number | null,
    title: data.title as string,
    slug: data.slug as string,
    status: data.status as SongStatus,
    current_version: (data.current_version as number | null) ?? 1,
    body: (data.body as string | null) ?? "",
    original_key: (data.original_key as string | null) ?? null,
    tempo_bpm: (data.tempo_bpm as number | null) ?? null,
    youtube_url: (data.youtube_url as string | null) ?? null,
    author_id: (data.author_id as string | null) ?? null,
    author2_id: (data.author2_id as string | null) ?? null,
    category_ids: cats.map((c) => c.category_id),
    submitted_at: (data.submitted_at as string | null) ?? null,
    reviewed_at: (data.reviewed_at as string | null) ?? null,
  };
}

export async function listAuthorOptions(): Promise<AuthorOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("authors")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AuthorOption[];
}

export async function listCategoryOptions(): Promise<CategoryOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CategoryOption[];
}

export async function listSongFiles(
  songId: string
): Promise<AdminSongFile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("song_files")
    .select(
      "id, song_id, kind, bucket, path, label, size_bytes, created_at"
    )
    .eq("song_id", songId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminSongFile[];
}

export async function listSongVersions(
  songId: string
): Promise<SongVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_song_versions", {
    p_song_id: songId,
  });
  if (error) throw error;
  return (data ?? []) as SongVersion[];
}

export async function listSongEvents(
  songId: string
): Promise<SongEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_song_events", {
    p_song_id: songId,
  });
  if (error) throw error;
  return (data ?? []) as SongEvent[];
}
