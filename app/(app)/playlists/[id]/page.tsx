import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaylistById } from "@/lib/playlists";
import { createClient } from "@/lib/supabase/server";
import { loadSchedulesForEntity } from "@/lib/schedule.server";
import { describeSchedule, isVisibleNow } from "@/lib/schedule";
import { PlaylistView } from "./playlist-view";
import { PrecacheButton } from "@/app/components/precache-button";
import { EditIcon } from "@/app/components/icons";
import { FavoritePlaylistHeart } from "./favorite-playlist-heart";

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pl = await getPlaylistById(id);
  if (!pl) notFound();

  const schedules = await loadSchedulesForEntity("playlist", pl.id);
  const outOfWindow = schedules.length > 0 && !isVisibleNow(schedules);

  // ¿El usuario actual puede editar esta playlist?
  // Editores: admin (cualquier playlist) o coordinator de la parroquia dueña.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let canEdit = false;
  if (user) {
    // Dueño de la playlist (relevante para playlists personales sin parroquia).
    const { data: ownerRow } = await supabase
      .from("playlists")
      .select("created_by")
      .eq("id", pl.id)
      .maybeSingle();
    if (ownerRow?.created_by === user.id) {
      canEdit = true;
    } else {
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
  }

  // Subtítulo de creador para playlists personales (parish_id IS NULL):
  // mostramos el nombre del creador si no es el usuario logueado (CU-17).
  let creatorName: string | null = null;
  if (!pl.parish) {
    const { data: creatorRows } = await supabase.rpc("get_playlist_creator", {
      p_playlist_id: pl.id,
    });
    const creator = (Array.isArray(creatorRows) ? creatorRows[0] : creatorRows) as
      | { created_by: string | null; display_name: string | null }
      | null
      | undefined;
    if (creator && creator.created_by !== user?.id) {
      creatorName = creator.display_name ?? "usuario desconocido";
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <h1 className="text-3xl text-page-title">{pl.name}</h1>
            <div className="flex flex-col items-center gap-1">
              <FavoritePlaylistHeart
                playlistId={pl.id}
                playlistName={pl.name}
                subtitle={pl.parish?.name}
              />
              {canEdit && (
                <Link
                  href={`/playlists/${pl.id}/editar`}
                  aria-label="Editar lista"
                  title="Editar lista"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:border-border hover:text-primary [&>svg]:h-6 [&>svg]:w-6"
                >
                  <EditIcon />
                </Link>
              )}
            </div>
          </div>
          {pl.is_archdiocesan && (
            <span className="text-xs uppercase tracking-wide text-secondary">
              De la Arquidiócesis
            </span>
          )}
          {pl.parish && !pl.is_archdiocesan && (
            <p className="text-sm normal-case text-muted-foreground">
              <Link
                href={`/parroquias/${pl.parish.slug}`}
                className="hover:text-primary"
              >
                {pl.parish.name}
              </Link>
            </p>
          )}
          {!pl.parish && creatorName && (
            <p className="text-xs normal-case text-muted-foreground">
              Autor: {creatorName}
            </p>
          )}
          {pl.description && (
            <p className="max-w-2xl text-base normal-case text-muted-foreground">
              {pl.description}
            </p>
          )}
          {(() => {
            const visibleSchedules = canEdit
              ? schedules
              : schedules.filter(
                  (s) => !(s.time_mode === "all_day" && s.date_mode === "always")
                );
            if (visibleSchedules.length === 0 && !outOfWindow) return null;
            return (
              <div className="flex flex-col gap-1">
                {visibleSchedules.length > 0 && (
                  <ul className="flex flex-col gap-0.5">
                    {visibleSchedules.map((s) => (
                      <li
                        key={s.id}
                        className="text-xs normal-case text-muted-foreground"
                      >
                        {describeSchedule(s)}
                      </li>
                    ))}
                  </ul>
                )}
                {outOfWindow && (
                  <span className="inline-flex w-fit items-center rounded-full border border-warning px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning">
                    Fuera de horario actual
                  </span>
                )}
              </div>
            );
          })()}
        </div>
        <div className="flex flex-col items-end gap-2">
          <PrecacheButton
            slugs={pl.songs.filter((s) => s.status === "published").map((s) => s.slug)}
            storageKey={`playlist:${pl.id}`}
          />
        </div>
      </header>

      <PlaylistView playlist={pl} />
    </main>
  );
}
