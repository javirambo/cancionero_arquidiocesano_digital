import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPlaylistById } from "@/lib/playlists";
import { createClient } from "@/lib/supabase/server";
import { PlaylistForm } from "@/app/playlists/playlist-form";
import { PlaylistSongsEditor } from "./songs-editor";

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

  let canEdit = isAdmin;
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

  const showArchdiocesan = pl.parish?.slug === "arquidiocesis";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-8">
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

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
          Datos
        </h2>
        <PlaylistForm
          mode="edit"
          parishSlug={pl.parish?.slug ?? ""}
          showArchdiocesan={showArchdiocesan}
          initial={{
            id: pl.id,
            parish_id: pl.parish?.id ?? "",
            name: pl.name,
            description: pl.description ?? "",
            event_date: pl.event_date ?? "",
            visibility: pl.visibility,
            is_archdiocesan: pl.is_archdiocesan,
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
          Canciones
        </h2>
        <PlaylistSongsEditor
          playlistId={pl.id}
          initialSongs={pl.songs.map((s) => ({
            song_id: s.id,
            position: s.position,
            number: s.number,
            title: s.title,
          }))}
        />
      </section>
    </main>
  );
}
