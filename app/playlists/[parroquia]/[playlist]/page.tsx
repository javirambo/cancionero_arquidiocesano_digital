import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaylistBySlug } from "@/lib/songs";
import { PlaylistView } from "./playlist-view";
import { QrButton } from "@/app/components/qr-button";

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ parroquia: string; playlist: string }>;
}) {
  const { parroquia, playlist } = await params;
  const pl = await getPlaylistBySlug(parroquia, playlist);
  if (!pl) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <nav className="text-sm normal-case text-muted-foreground">
        <Link href="/playlists" className="hover:text-primary">
          ← Playlists
        </Link>
        {pl.parish && (
          <>
            <span className="mx-2">·</span>
            <Link
              href={`/parroquias/${pl.parish.slug}`}
              className="hover:text-primary"
            >
              {pl.parish.name}
            </Link>
          </>
        )}
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            Playlist
            {pl.event_date &&
              ` · ${new Date(pl.event_date).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}`}
          </p>
          <h1 className="text-3xl">{pl.name}</h1>
          {pl.description && (
            <p className="max-w-2xl text-base normal-case text-muted-foreground">
              {pl.description}
            </p>
          )}
        </div>
        <QrButton
          path={pl.parish ? `/playlists/${pl.parish.slug}/${pl.slug}` : undefined}
          filename={`playlist-${pl.slug}`}
        />
      </header>

      <PlaylistView playlist={pl} />
    </main>
  );
}
