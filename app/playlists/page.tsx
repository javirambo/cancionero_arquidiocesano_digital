import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  listMyPlaylistsGrouped,
  type ParishPlaylistItem,
} from "@/lib/playlists";
import { GoogleSignInButton } from "@/app/perfil/google-sign-in-button";

export const metadata = {
  title: "Playlists · Cancionero Arquidiocesano",
};

export default async function PlaylistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            Playlists
          </p>
          <h1 className="text-3xl">Iniciar sesión</h1>
        </header>
        <section className="rounded-2xl border border-border bg-sidebar p-6">
          <p className="text-sm normal-case text-muted-foreground">
            Iniciá sesión con tu cuenta de Google para guardar favoritos,
            vincular tu parroquia y acceder a tus listas.
          </p>
          <GoogleSignInButton />
        </section>
      </main>
    );
  }

  const groups = await listMyPlaylistsGrouped(user.id);

  if (groups.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            Playlists
          </p>
          <h1 className="text-3xl">Tus playlists</h1>
        </header>
        <section className="rounded-2xl border border-border bg-sidebar p-6">
          <p className="text-sm normal-case text-muted-foreground">
            Vinculá tu parroquia para ver sus playlists.
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
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Tus playlists</h1>
        <p className="text-base normal-case text-muted-foreground">
          Repertorios de las parroquias en las que participás.
        </p>
      </header>

      {groups.map((g) => (
        <section key={g.parish.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
              {g.parish.name}
            </h2>
            <Link
              href={`/parroquias/${g.parish.slug}/playlists`}
              className="text-sm normal-case text-primary hover:underline"
            >
              Ver todas
            </Link>
          </div>
          {g.items.length === 0 ? (
            <p className="rounded-xl border border-border bg-sidebar p-4 text-sm normal-case text-muted-foreground">
              Esta parroquia todavía no tiene playlists.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {g.items.map((p) => (
                <PlaylistCard key={p.id} playlist={p} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}

function PlaylistCard({ playlist }: { playlist: ParishPlaylistItem }) {
  return (
    <li>
      <Link
        href={`/playlists/${playlist.id}`}
        className="flex h-full flex-col gap-1 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary"
      >
        <span className="text-base text-primary">{playlist.name}</span>
        {playlist.relation === "archdiocesan" && (
          <span className="text-xs uppercase tracking-wide text-secondary">
            De la Arquidiócesis
          </span>
        )}
        {playlist.relation === "subscribed" && playlist.parish && (
          <span className="text-xs uppercase tracking-wide text-secondary">
            Compartida por {playlist.parish.name}
          </span>
        )}
        {playlist.event_date && (
          <span className="text-xs normal-case text-muted-foreground">
            {new Date(playlist.event_date).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
        )}
        {playlist.description && (
          <span className="text-sm normal-case text-muted-foreground">
            {playlist.description}
          </span>
        )}
      </Link>
    </li>
  );
}
