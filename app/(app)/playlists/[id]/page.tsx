import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaylistById } from "@/lib/playlists";
import { createClient } from "@/lib/supabase/server";
import { loadSchedulesForEntity } from "@/lib/schedule.server";
import { describeSchedule, isVisibleNow } from "@/lib/schedule";
import { PlaylistView } from "./playlist-view";
import { PrecacheButton } from "@/app/components/precache-button";

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

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      <Link
        href="/playlists"
        className="flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-secondary hover:underline"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Volver a las listas
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl text-page-title">{pl.name}</h1>
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
          {canEdit && (
            <Link
              href={`/playlists/${pl.id}/editar`}
              className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Editar Lista
            </Link>
          )}
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
