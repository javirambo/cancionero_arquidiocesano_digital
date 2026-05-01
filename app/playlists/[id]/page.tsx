import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaylistById } from "@/lib/playlists";
import { createClient } from "@/lib/supabase/server";
import { PlaylistView } from "./playlist-view";
import { QrButton } from "@/app/components/qr-button";
import { formatearFecha } from "@/lib/dates";

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pl = await getPlaylistById(id);
  if (!pl) notFound();

  // ¿El usuario actual puede editar esta playlist?
  // Editores: admin (cualquier playlist) o coordinator de la parroquia dueña.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let canEdit = false;
  if (user) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);
    const roleNames = (roles ?? [])
      .map((r) => {
        const rel = r.roles as { name: string } | { name: string }[] | null;
        const single = Array.isArray(rel) ? rel[0] : rel;
        return single?.name;
      })
      .filter((n): n is string => Boolean(n));
    if (roleNames.includes("admin")) {
      canEdit = true;
    } else if (pl.parish) {
      const { data: member } = await supabase
        .from("parish_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("parish_id", pl.parish.id)
        .maybeSingle();
      if (member?.role === "coordinator") canEdit = true;
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <nav className="text-sm normal-case text-muted-foreground">
        {pl.parish ? (
          <Link
            href={`/parroquias/${pl.parish.slug}/playlists`}
            className="hover:text-primary"
          >
            ← Playlists de {pl.parish.name}
          </Link>
        ) : (
          <Link href="/parroquias" className="hover:text-primary">
            ← Parroquias
          </Link>
        )}
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            Playlist
            {pl.event_date && ` · ${formatearFecha(pl.event_date)}`}
          </p>
          <h1 className="text-3xl">{pl.name}</h1>
          {pl.is_archdiocesan && (
            <span className="text-xs uppercase tracking-wide text-secondary">
              De la Arquidiócesis
            </span>
          )}
          {pl.parish && (
            <p className="text-sm normal-case text-muted-foreground">
              <Link
                href={`/parroquias/${pl.parish.slug}`}
                className="hover:text-primary"
              >
                {pl.parish.name}
              </Link>
            </p>
          )}
          {pl.description && (
            <p className="max-w-2xl text-base normal-case text-muted-foreground">
              {pl.description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <QrButton path={`/playlists/${pl.id}`} filename={`playlist-${pl.id}`} />
          {canEdit && (
            <Link
              href={`/playlists/${pl.id}/editar`}
              className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Editar playlist
            </Link>
          )}
        </div>
      </header>

      <PlaylistView playlist={pl} />
    </main>
  );
}
