import { notFound } from "next/navigation";
import { getSongBySlug, getSongsByIds, youtubeEmbedUrl } from "@/lib/songs";
import { getPlaylistById } from "@/lib/playlists";
import { SongView } from "./song-view";
import { FavoriteHeartInline } from "./favorite-heart-inline";
import { PlaylistSongPager } from "./playlist-song-pager";

// Ventana de canciones precargadas alrededor de la actual cuando se navega
// dentro de una playlist. Permite swipe instantáneo sin round-trip al server.
const PRELOAD_WINDOW = 20;

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

  // Contexto de playlist (CU-05): navegación anterior/siguiente + precarga.
  let playlistCtx: {
    name: string;
    playlistId: string;
    keyOverride: string | null;
    prev: { slug: string; title: string } | null;
    next: { slug: string; title: string } | null;
    preloadedSongs: Array<
      Awaited<ReturnType<typeof getSongsByIds>>[number] & {
        key_override: string | null;
        youtubeEmbed: string | null;
      }
    >;
  } | null = null;
  if (sp.pl) {
    const pl = await getPlaylistById(sp.pl);
    if (pl) {
      const idx = pl.songs.findIndex((s) => s.slug === slug);
      if (idx !== -1) {
        // Para prev/next: saltear canciones no publicadas (no se pueden abrir).
        let prevIdx = idx - 1;
        while (prevIdx >= 0 && pl.songs[prevIdx].status !== "published") {
          prevIdx--;
        }
        let nextIdx = idx + 1;
        while (
          nextIdx < pl.songs.length &&
          pl.songs[nextIdx].status !== "published"
        ) {
          nextIdx++;
        }

        // Ventana de canciones publicadas a precargar, centrada en la actual.
        const publishedSongs = pl.songs.filter((s) => s.status === "published");
        const currentPubIdx = publishedSongs.findIndex((s) => s.slug === slug);
        let windowSongs = publishedSongs;
        if (publishedSongs.length > PRELOAD_WINDOW) {
          const half = Math.floor(PRELOAD_WINDOW / 2);
          let from = Math.max(0, currentPubIdx - half);
          let to = from + PRELOAD_WINDOW;
          if (to > publishedSongs.length) {
            to = publishedSongs.length;
            from = Math.max(0, to - PRELOAD_WINDOW);
          }
          windowSongs = publishedSongs.slice(from, to);
        }

        const windowIds = windowSongs.map((s) => s.id);
        const fullSongs = await getSongsByIds(windowIds);
        const keyOverrideById = new Map(
          windowSongs.map((s) => [s.id, s.key_override])
        );
        const preloadedSongs = fullSongs.map((fs) => ({
          ...fs,
          key_override: keyOverrideById.get(fs.id) ?? null,
          youtubeEmbed: youtubeEmbedUrl(fs.youtube_url),
        }));

        playlistCtx = {
          name: pl.name,
          playlistId: pl.id,
          keyOverride: pl.songs[idx].key_override,
          prev:
            prevIdx >= 0
              ? { slug: pl.songs[prevIdx].slug, title: pl.songs[prevIdx].title }
              : null,
          next:
            nextIdx < pl.songs.length
              ? { slug: pl.songs[nextIdx].slug, title: pl.songs[nextIdx].title }
              : null,
          preloadedSongs,
        };
      }
    }
  }

  const plQuery = playlistCtx ? `?pl=${playlistCtx.playlistId}` : "";

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      {playlistCtx ? (
        <PlaylistSongPager
          songs={playlistCtx.preloadedSongs}
          initialSlug={slug}
          playlistId={playlistCtx.playlistId}
        />
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary">
                {song.number !== null ? `Nº ${song.number}` : "Canto"}
              </p>
              <h1 className="text-3xl leading-tight text-song-title">
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
              {song.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {song.categories.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-border bg-sidebar px-2 py-px text-[10px] uppercase tracking-wide text-primary"
                    >
                      {c}
                    </span>
                  ))}
                </div>
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
            playlistKeyOverride={null}
            inPlaylistContext={false}
          />
        </>
      )}
    </main>
  );
}
