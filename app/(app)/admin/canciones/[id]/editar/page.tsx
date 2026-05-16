import { notFound, redirect } from "next/navigation";
import { getAdminAccess } from "@/app/(app)/admin/access";
import { createClient } from "@/lib/supabase/server";
import {
  getSongForAdmin,
  listAuthorOptions,
  listCategoryOptions,
  listSongFiles,
} from "@/lib/songs-admin";
import { SongForm } from "./song-form";
import { ReviewActions } from "./review-actions";

export const dynamic = "force-dynamic";

export default async function EditarCancionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");

  const { id } = await params;
  const [song, authors, categories, files] = await Promise.all([
    getSongForAdmin(id),
    listAuthorOptions(),
    listCategoryOptions(),
    listSongFiles(id),
  ]);
  if (!song) notFound();

  // Una canción se puede borrar definitivamente solo si nunca salió de
  // draft. Como aproximación estricta sin tabla de auditoría: status =
  // 'draft' y sin filas en song_versions (snapshot que se inserta al
  // pasar a 'review' por primera vez).
  let canDelete = false;
  if (song.status === "draft") {
    const supabase = await createClient();
    const { count } = await supabase
      .from("song_versions")
      .select("song_id", { count: "exact", head: true })
      .eq("song_id", song.id);
    canDelete = (count ?? 0) === 0;
  }

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-secondary">
          Editar canto
        </span>
        <h1 className="text-2xl text-page-title">{song.title}</h1>
      </header>

      <ReviewActions
        songId={song.id}
        status={song.status}
        reviewNotes={song.review_notes}
        canReview={access.isEditor || access.isAdmin}
        canDelete={canDelete}
      />

      <SongForm
        song={song}
        authors={authors}
        categories={categories}
        files={files}
      />
    </main>
  );
}
