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
  tags: string[];
  youtube_url: string | null;
  author_id: string | null;
  category_id: string | null;
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
  is_primary: boolean;
  size_bytes: number | null;
  status: SongStatus;
  created_at: string;
};

type Named = { name: string } | { name: string }[] | null;
function firstName(rel: Named): string | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0]?.name ?? null;
  return rel.name ?? null;
}

export async function listSongsForAdmin(
  q: string = ""
): Promise<AdminSongRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("songs")
    .select(
      "id, number, title, slug, status, updated_at, body, youtube_url, categories(name), authors(name), song_files(id)"
    )
    .order("updated_at", { ascending: false })
    .limit(200);
  const term = q.trim();
  if (term) query = query.ilike("title", `%${term}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => {
    const body = (row.body as string | null) ?? "";
    const files = (row.song_files as { id: string }[] | null) ?? [];
    return {
      id: row.id as string,
      number: row.number as number | null,
      title: row.title as string,
      slug: row.slug as string,
      status: row.status as SongStatus,
      category: firstName(row.categories as Named),
      author: firstName(row.authors as Named),
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
      "id, number, title, slug, status, body, original_key, tempo_bpm, tags, youtube_url, author_id, category_id"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    number: data.number as number | null,
    title: data.title as string,
    slug: data.slug as string,
    status: data.status as SongStatus,
    body: (data.body as string | null) ?? "",
    original_key: (data.original_key as string | null) ?? null,
    tempo_bpm: (data.tempo_bpm as number | null) ?? null,
    tags: ((data.tags as string[] | null) ?? []) as string[],
    youtube_url: (data.youtube_url as string | null) ?? null,
    author_id: (data.author_id as string | null) ?? null,
    category_id: (data.category_id as string | null) ?? null,
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
      "id, song_id, kind, bucket, path, label, is_primary, size_bytes, status, created_at"
    )
    .eq("song_id", songId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminSongFile[];
}
