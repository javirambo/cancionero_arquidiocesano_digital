import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminAccess } from "@/app/admin/access";
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

  return (
    <main className="flex flex-col gap-6">
      <nav className="text-sm normal-case text-muted-foreground">
        <Link href="/admin/canciones" className="hover:text-primary">
          ← Canciones
        </Link>
      </nav>

      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-secondary">
          Editar canción
        </span>
        <h1 className="text-2xl">{song.title}</h1>
      </header>

      <ReviewActions
        songId={song.id}
        status={song.status}
        reviewNotes={song.review_notes}
        canReview={access.isEditor || access.isAdmin}
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
