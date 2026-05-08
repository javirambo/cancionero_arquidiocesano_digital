import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("playlist_songs")
    .select("position, songs(id, slug)")
    .eq("playlist_id", id)
    .order("position", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = { songs: { id: string; slug: string } | { id: string; slug: string }[] | null };
  const items = (data ?? []) as Row[];
  const songs = items
    .map((row) => {
      const rel = row.songs;
      const single = Array.isArray(rel) ? rel[0] : rel;
      return single ? { id: single.id, slug: single.slug } : null;
    })
    .filter((s): s is { id: string; slug: string } => Boolean(s));

  return NextResponse.json({ songs });
}
