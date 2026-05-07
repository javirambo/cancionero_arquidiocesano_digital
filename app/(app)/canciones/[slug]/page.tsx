import { notFound } from "next/navigation";
import { getSongBySlug, youtubeEmbedUrl } from "@/lib/songs";
import { getPlaylistById } from "@/lib/playlists";
import { SongView } from "./song-view";
import { FavoriteHeartInline } from "./favorite-heart-inline";
import { PlaylistNav } from "./playlist-nav";

export default async function CancionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pl?: string }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const song = await getSongBySlug(slug);
  if (!song) notFound();

  const embed = youtubeEmbedUrl(song.youtube_url);

  // Contexto de playlist (CU-05): navegación anterior/siguiente.
  let playlistCtx: {
    name: string;
    playlistId: string;
    prev: { slug: string; title: string } | null;
    next: { slug: string; title: string } | null;
  } | null = null;
  if (sp.pl) {
    const pl = await getPlaylistById(sp.pl);
    if (pl) {
      const idx = pl.songs.findIndex((s) => s.slug === slug);
      if (idx !== -1) {
        playlistCtx = {
          name: pl.name,
          playlistId: pl.id,
          prev:
            idx > 0
              ? { slug: pl.songs[idx - 1].slug, title: pl.songs[idx - 1].title }
              : null,
          next:
            idx < pl.songs.length - 1
              ? { slug: pl.songs[idx + 1].slug, title: pl.songs[idx + 1].title }
              : null,
        };
      }
    }
  }

  const plQuery = playlistCtx ? `?pl=${playlistCtx.playlistId}` : "";

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            {song.number !== null ? `Nº ${song.number}` : "Canto"}
            {song.category && ` · ${song.category}`}
          </p>
          <h1 className="text-3xl leading-tight">
            <span className="relative inline-block">
              {song.title}
              <FavoriteHeartInline songId={song.id} />
            </span>
          </h1>
          {song.author && (
            <p className="text-sm normal-case text-muted-foreground">
              Autor: {song.author}
            </p>
          )}
        </div>
      </header>

      <SongView
        songId={song.id}
        songSlug={slug}
        songTitle={song.title}
        body={song.body}
        originalKey={song.original_key}
        youtubeEmbed={embed}
        hasFiles={song.hasFiles}
      />

      {playlistCtx && (
        <PlaylistNav
          prev={playlistCtx.prev}
          next={playlistCtx.next}
          plQuery={plQuery}
        />
      )}
    </main>
  );
}
