import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  listArchdiocesanPlaylists,
  listMyPlaylistsSections,
} from "@/lib/playlists";
import { PlaylistCard } from "./playlist-card";

export const metadata = {
  title: "Playlists · Cancionero Arquidiocesano",
};

export default async function PlaylistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const archdiocesan = await listArchdiocesanPlaylists();
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl">Playlists</h1>
          <p className="text-base italic normal-case text-muted-foreground">
            Estás navegando como invitado. Iniciá sesión para guardar tus
            favoritos en la nube, vincular tu parroquia y acceder a tus listas.
          </p>
          <p className="text-base normal-case text-muted-foreground">
            Listas de cantos arquidiocesanos.
          </p>
        </header>

        {archdiocesan.length > 0 ? (
          <section className="flex flex-col gap-3">
            <ul className="grid gap-3 sm:grid-cols-2">
              {archdiocesan.map((p) => (
                <PlaylistCard
                  key={p.id}
                  playlist={{
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    parish: p.parish,
                  }}
                  badge="De la Arquidiócesis"
                />
              ))}
            </ul>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-sidebar p-6">
            <p className="text-sm normal-case text-muted-foreground">
              Todavía no hay playlists arquidiocesanas disponibles.
            </p>
          </section>
        )}
      </main>
    );
  }

  const sections = await listMyPlaylistsSections(user.id, {
    includeOutOfWindow: true,
  });
  const isEmpty =
    sections.personal.length === 0 &&
    sections.byParish.length === 0 &&
    sections.archdiocesan.length === 0;

  if (isEmpty) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            Playlists
          </p>
          <h1 className="text-3xl">Tus Listas</h1>
        </header>
        <section className="rounded-2xl border border-border bg-sidebar p-6">
          <p className="text-sm normal-case text-muted-foreground">
            Todavía no tenés playlists. Vinculá tu parroquia o creá una playlist
            personal desde el menú &quot;…&quot; de cualquier canción.
          </p>
          <Link
            href="/perfil"
            className="mt-4 inline-block rounded-full border border-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Ir a mi perfil
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Tus Listas</h1>
        <p className="text-base normal-case text-muted-foreground">
          Tus repertorios personales, los de tus parroquias y los de la
          Arquidiócesis.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {sections.personal.map((p) => (
          <PlaylistCard
            key={p.id}
            playlist={{
              id: p.id,
              name: p.name,
              description: p.description,
              parish: p.parish,
            }}
            badge="Personal"
          />
        ))}
        {sections.byParish.flatMap((g) =>
          g.items.map((p) => (
            <PlaylistCard
              key={p.id}
              playlist={{
                id: p.id,
                name: p.name,
                description: p.description,
                parish: p.parish,
              }}
              badge={
                p.relation === "subscribed" && p.parish
                  ? `Compartida por ${p.parish.name}`
                  : null
              }
            />
          ))
        )}
        {sections.archdiocesan.map((p) => (
          <PlaylistCard
            key={p.id}
            playlist={{
              id: p.id,
              name: p.name,
              description: p.description,
              parish: p.parish,
            }}
            badge="De la Arquidiócesis"
          />
        ))}
      </ul>
    </main>
  );
}
