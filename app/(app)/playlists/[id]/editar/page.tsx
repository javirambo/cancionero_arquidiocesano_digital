import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPlaylistById } from "@/lib/playlists";
import { createClient } from "@/lib/supabase/server";
import { loadSchedulesForEntity } from "@/lib/schedule.server";
import { PlaylistForm } from "@/app/(app)/playlists/playlist-form";
import { PlaylistSongsEditor } from "./songs-editor";
import { AccordionSection } from "@/app/components/accordion-section";

export default async function EditarPlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pl = await getPlaylistById(id);
  if (!pl) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/perfil");

  // Permisos: admin o coordinator de la parroquia dueña.
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
  const isAdmin = roleNames.includes("admin");

  // Dueño de la lista (relevante para listas personales).
  const { data: ownerRow } = await supabase
    .from("playlists")
    .select("created_by")
    .eq("id", pl.id)
    .maybeSingle();
  const isOwner = ownerRow?.created_by === user.id;

  let canEdit = isAdmin || isOwner;
  if (!canEdit && pl.parish) {
    const { data: member } = await supabase
      .from("parish_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("parish_id", pl.parish.id)
      .maybeSingle();
    canEdit = member?.role === "coordinator";
  }
  if (!canEdit) redirect(`/playlists/${pl.id}`);

  // Lista personal del usuario actual (sin parroquia y dueña): edición restringida.
  const isPersonalOwner = isOwner && !pl.parish && !isAdmin;

  const showArchdiocesan = pl.parish?.slug === "arquidiocesis";
  const schedules = await loadSchedulesForEntity("playlist", pl.id);

  // Sólo admin puede reasignar el dueño de la playlist (CU-17).
  let adminParishOptions:
    | { id: string; slug: string; name: string }[]
    | undefined;
  if (isAdmin) {
    const { data: parishes } = await supabase
      .from("parishes")
      .select("id, slug, name")
      .eq("status", "active")
      .order("name");
    adminParishOptions = (parishes ?? []) as {
      id: string;
      slug: string;
      name: string;
    }[];
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Link
        href={`/playlists/${pl.id}`}
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
        Volver a la playlist
      </Link>
      <h1 className="text-2xl">Editar: {pl.name}</h1>

      <AccordionSection title="Datos" defaultOpen={false}>
        <PlaylistForm
          mode="edit"
          parishSlug={pl.parish?.slug ?? null}
          showArchdiocesan={showArchdiocesan}
          adminParishOptions={adminParishOptions}
          restricted={isPersonalOwner}
          initial={{
            id: pl.id,
            parish_id: pl.parish?.id ?? null,
            name: pl.name,
            description: pl.description ?? "",
            image_path: pl.image_path,
            visibility: pl.visibility,
            is_archdiocesan: pl.is_archdiocesan,
            schedules: schedules.map((s) => ({
              date_mode: s.date_mode,
              weekdays: s.weekdays,
              start_date: s.start_date,
              end_date: s.end_date,
              time_mode: s.time_mode,
              start_time: s.start_time,
              end_time: s.end_time,
            })),
          }}
        />
      </AccordionSection>

      <AccordionSection title="Cantos" defaultOpen>
        <PlaylistSongsEditor
          playlistId={pl.id}
          initialSongs={pl.songs.map((s) => ({
            song_id: s.id,
            position: s.position,
            number: s.number,
            title: s.title,
          }))}
        />
      </AccordionSection>
    </main>
  );
}
