import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SongItem = { song_id: string; position: number };

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playlistId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "no-session" }, { status: 401 });
  }

  let body: { songs?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  if (!Array.isArray(body.songs)) {
    return NextResponse.json({ error: "songs-required" }, { status: 400 });
  }

  const songs: SongItem[] = [];
  for (const raw of body.songs) {
    if (
      !raw ||
      typeof raw !== "object" ||
      typeof (raw as SongItem).song_id !== "string" ||
      typeof (raw as SongItem).position !== "number"
    ) {
      return NextResponse.json({ error: "invalid-song-item" }, { status: 400 });
    }
    songs.push({
      song_id: (raw as SongItem).song_id,
      position: (raw as SongItem).position,
    });
  }

  const { error: delError } = await supabase
    .from("playlist_songs")
    .delete()
    .eq("playlist_id", playlistId);
  if (delError) {
    console.error("[playlists/songs PUT] delete", delError);
    return NextResponse.json(
      { error: "delete-failed", message: delError.message },
      { status: 500 }
    );
  }

  if (songs.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const rows = songs.map((s) => ({
    playlist_id: playlistId,
    song_id: s.song_id,
    position: s.position,
  }));
  const { error: insError } = await supabase.from("playlist_songs").insert(rows);
  if (insError) {
    console.error("[playlists/songs PUT] insert", insError);
    return NextResponse.json(
      { error: "insert-failed", message: insError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
