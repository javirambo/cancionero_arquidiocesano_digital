import Link from "next/link";
import { listPlaylists } from "@/lib/songs";

export const metadata = {
  title: "Playlists · Cancionero Arquidiocesano",
};

export default async function PlaylistsPage() {
  const playlists = await listPlaylists();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Playlists</h1>
        <p className="text-base normal-case text-muted-foreground">
          Repertorios públicos de las parroquias y festividades.
        </p>
      </header>

      {playlists.length === 0 ? (
        <p className="rounded-xl border border-border bg-sidebar p-6 text-base normal-case text-muted-foreground">
          Todavía no hay playlists publicadas.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {playlists.map((p) => (
            <li key={p.id}>
              <Link
                href={
                  p.parish
                    ? `/playlists/${p.parish.slug}/${p.slug}`
                    : `/playlists`
                }
                className="flex h-full flex-col gap-2 rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary"
              >
                <span className="text-lg text-primary">{p.name}</span>
                {p.parish && (
                  <span className="text-xs uppercase tracking-wide text-secondary">
                    {p.parish.name}
                  </span>
                )}
                {p.event_date && (
                  <span className="text-xs normal-case text-muted-foreground">
                    {new Date(p.event_date).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
                {p.description && (
                  <span className="text-sm normal-case text-muted-foreground">
                    {p.description}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
