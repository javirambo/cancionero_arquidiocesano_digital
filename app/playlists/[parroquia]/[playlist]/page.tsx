import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaylistBySlug } from "@/lib/songs";

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

      <header className="flex flex-col gap-2">
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
      </header>

      {pl.songs.length === 0 ? (
        <p className="rounded-xl border border-border bg-sidebar p-6 text-base normal-case text-muted-foreground">
          Esta playlist todavía no tiene canciones.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-border rounded-xl border border-border bg-background">
          {pl.songs.map((s, i) => (
            <li key={s.id}>
              <Link
                href={{
                  pathname: `/canciones/${s.slug}`,
                  query: {
                    pl: pl.slug,
                    parroquia: pl.parish?.slug ?? "",
                  },
                }}
                className="flex items-baseline gap-4 px-5 py-3 transition-colors hover:bg-sidebar"
              >
                <span className="w-6 shrink-0 text-sm normal-case text-muted-foreground">
                  {i + 1}.
                </span>
                <span className="w-12 shrink-0 text-sm normal-case text-muted-foreground">
                  {s.number !== null ? String(s.number).padStart(3, "0") : "—"}
                </span>
                <span className="flex-1 text-lg text-primary">{s.title}</span>
                {s.author && (
                  <span className="hidden text-xs normal-case text-muted-foreground sm:block">
                    {s.author}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
