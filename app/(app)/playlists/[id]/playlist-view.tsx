"use client";

import { useMemo } from "react";
import type { PlaylistWithSongs } from "@/lib/playlists";
import { SongRow } from "@/app/components/song-row";

type Props = {
  playlist: PlaylistWithSongs;
};

export function PlaylistView({ playlist }: Props) {
  const sorted = useMemo(() => {
    const arr = playlist.songs.filter((s) => s.status === "published");
    arr.sort((a, b) => a.position - b.position);
    return arr;
  }, [playlist.songs]);

  return (
    <>
      {sorted.length === 0 ? (
        <p className="rounded-xl border border-border bg-background p-6 text-base normal-case text-muted-foreground">
          Esta playlist todavía no tiene canciones.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-border rounded-xl border border-border bg-background">
          {sorted.map((s) => (
            <SongRow
              key={s.id}
              song={s}
              playlistContext={{ playlistId: playlist.id, canManage: false }}
            />
          ))}
        </ol>
      )}
    </>
  );
}
