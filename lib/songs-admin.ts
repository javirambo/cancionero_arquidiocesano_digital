import { createClient } from "@/lib/supabase/server";

export type SongStatus =
  | "draft"
  | "review"
  | "published"
  | "rejected"
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
  body: string;
  original_key: string | null;
  tempo_bpm: number | null;
  youtube_url: string | null;
  author_id: string | null;
  author2_id: string | null;
  category_ids: string[];
  review_notes: string | null;
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

export async function listSongsForAdmin(
  q: string = "",
  status: SongStatus | "todas" = "todas"
): Promise<AdminSongRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("songs")
    .select(
      "id, number, title, slug, status, updated_at, body, youtube_url, song_categories(categories(name)), author1:authors!songs_author_id_fkey(name), author2:authors!songs_author2_id_fkey(name), song_files(id)"
    )
    .order("updated_at", { ascending: false })
    .limit(200);
  const term = q.trim();
  if (term) {
    const asNumber = /^\d+$/.test(term) ? Number(term) : null;
    if (asNumber !== null) {
      query = query.or(`title.ilike.%${term}%,number.eq.${asNumber}`);
    } else {
      query = query.ilike("title", `%${term}%`);
    }
  }
  if (status !== "todas") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    console.error("[listSongsForAdmin] supabase error", error);
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => {
    const body = (row.body as string | null) ?? "";
    const files = (row.song_files as { id: string }[] | null) ?? [];
    const cats = categoryNames(row.song_categories as SongCategoryRel);
    return {
      id: row.id as string,
      number: row.number as number | null,
      title: row.title as string,
      slug: row.slug as string,
      status: row.status as SongStatus,
      category: cats.length > 0 ? cats.join(", ") : null,
      author: joinAuthors(row.author1 as Named, row.author2 as Named),
      updated_at: row.updated_at as string,
      hasChords: /\[[^\]]+\]/.test(body),
      hasYoutube: Boolean(row.youtube_url),
      hasFiles: files.length > 0,
    };
  });
}

export async function getSongForAdmin(
  id: string
): Promise<AdminSongDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("songs")
    .select(
      "id, number, title, slug, status, body, original_key, tempo_bpm, youtube_url, author_id, author2_id, review_notes, submitted_at, reviewed_at, song_categories(category_id)"
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
    body: (data.body as string | null) ?? "",
    original_key: (data.original_key as string | null) ?? null,
    tempo_bpm: (data.tempo_bpm as number | null) ?? null,
    youtube_url: (data.youtube_url as string | null) ?? null,
    author_id: (data.author_id as string | null) ?? null,
    author2_id: (data.author2_id as string | null) ?? null,
    category_ids: cats.map((c) => c.category_id),
    review_notes: (data.review_notes as string | null) ?? null,
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
