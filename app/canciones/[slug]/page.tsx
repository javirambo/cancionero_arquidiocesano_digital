import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPlaylistBySlug,
  getSongBySlug,
  youtubeEmbedUrl,
} from "@/lib/songs";
import { SongView } from "./song-view";
import { QrButton } from "@/app/components/qr-button";

export default async function CancionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pl?: string; parroquia?: string }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const song = await getSongBySlug(slug);
  if (!song) notFound();

  const embed = youtubeEmbedUrl(song.youtube_url);

  // Contexto de playlist (CU-05): navegación anterior/siguiente.
  let playlistCtx: {
    name: string;
    parishSlug: string;
    playlistSlug: string;
    prev: { slug: string; title: string } | null;
    next: { slug: string; title: string } | null;
  } | null = null;
  if (sp.pl && sp.parroquia) {
    const pl = await getPlaylistBySlug(sp.parroquia, sp.pl);
    if (pl) {
      const idx = pl.songs.findIndex((s) => s.slug === slug);
      if (idx !== -1) {
        playlistCtx = {
          name: pl.name,
          parishSlug: sp.parroquia,
          playlistSlug: sp.pl,
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

  const plQuery = playlistCtx
    ? `?pl=${playlistCtx.playlistSlug}&parroquia=${playlistCtx.parishSlug}`
    : "";

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <nav className="text-sm normal-case text-muted-foreground">
        {playlistCtx ? (
          <Link
            href={`/playlists/${playlistCtx.parishSlug}/${playlistCtx.playlistSlug}`}
            className="hover:text-primary"
          >
            ← {playlistCtx.name}
          </Link>
        ) : (
          <Link href="/canciones" className="hover:text-primary">
            ← Canciones
          </Link>
        )}
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            {song.number !== null ? `Nº ${song.number}` : "Canción"}
            {song.category && ` · ${song.category}`}
          </p>
          <h1 className="text-3xl leading-tight">{song.title}</h1>
          {song.author && (
            <p className="text-sm normal-case text-muted-foreground">
              Autor: {song.author}
            </p>
          )}
        </div>
        <QrButton path={`/canciones/${song.slug}`} filename={`cancion-${song.slug}`} />
      </header>

      <SongView
        songId={song.id}
        body={song.body}
        originalKey={song.original_key}
        youtubeEmbed={embed}
      />

      {playlistCtx && (
        <nav
          aria-label="Navegación dentro de la playlist"
          className="mt-4 flex items-stretch justify-between gap-3 border-t border-border pt-4"
        >
          {playlistCtx.prev ? (
            <Link
              href={`/canciones/${playlistCtx.prev.slug}${plQuery}`}
              className="flex flex-1 flex-col rounded-xl border border-border bg-background px-4 py-3 normal-case transition-colors hover:border-primary"
            >
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                ← Anterior
              </span>
              <span className="text-base text-primary">
                {playlistCtx.prev.title}
              </span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {playlistCtx.next ? (
            <Link
              href={`/canciones/${playlistCtx.next.slug}${plQuery}`}
              className="flex flex-1 flex-col items-end rounded-xl border border-border bg-background px-4 py-3 normal-case transition-colors hover:border-primary"
            >
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Siguiente →
              </span>
              <span className="text-base text-primary">
                {playlistCtx.next.title}
              </span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
        </nav>
      )}
    </main>
  );
}
