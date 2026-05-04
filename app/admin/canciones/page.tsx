import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAccess } from "../access";
import { listSongsForAdmin, type SongStatus } from "@/lib/songs-admin";
import { formatearFecha } from "@/lib/dates";
import {
  ChordsIcon,
  EditIcon,
  FilesIcon,
  PlayIcon,
} from "@/app/components/icons";

const statusLabel: Record<SongStatus, string> = {
  draft: "Borrador",
  review: "En revisión",
  published: "Publicada",
  rejected: "Rechazada",
  archived: "Archivada",
};

export default async function AdminCancionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");

  const sp = await searchParams;
  const q = sp.q ?? "";
  const songs = await listSongsForAdmin(q);

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="text-2xl">Canciones</h1>
          <p className="text-sm normal-case text-muted-foreground">
            Edición de metadatos, letra/acordes y archivos. (El flujo de revisión se habilita más adelante.)
          </p>
        </div>
      </header>

      <form className="flex flex-wrap gap-2" action="/admin/canciones">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por título…"
          className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case"
        />
        <button
          type="submit"
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-foreground hover:border-primary hover:text-primary"
        >
          Buscar
        </button>
      </form>

      {songs.length === 0 ? (
        <p className="text-sm normal-case text-muted-foreground">
          No hay canciones que mostrar.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {songs.map((s) => {
            const line2Parts: string[] = [statusLabel[s.status]];
            if (s.category) line2Parts.push(s.category);
            return (
              <li
                key={s.id}
                className="relative flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-sidebar sm:flex-row sm:items-center sm:gap-3"
              >
                <Link
                  href={`/admin/canciones/${s.id}/editar`}
                  aria-label="Editar"
                  title="Editar"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary sm:hidden"
                >
                  <EditIcon />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-base text-primary">
                    {s.number !== null ? `Nº ${s.number} · ` : ""}
                    {s.title}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs normal-case text-muted-foreground">
                    <span className="truncate">{line2Parts.join(" · ")}</span>
                    {(s.hasChords || s.hasYoutube || s.hasFiles) && (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        {s.hasChords && (
                          <span aria-label="Tiene acordes" title="Tiene acordes">
                            <ChordsIcon />
                          </span>
                        )}
                        {s.hasYoutube && (
                          <span aria-label="Tiene YouTube" title="Tiene YouTube">
                            <PlayIcon />
                          </span>
                        )}
                        {s.hasFiles && (
                          <span aria-label="Tiene archivos" title="Tiene archivos">
                            <FilesIcon />
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs normal-case text-muted-foreground">
                    Modificada {formatearFecha(s.updated_at)}
                  </span>
                </div>
                <div className="hidden justify-end sm:flex sm:justify-start">
                  <Link
                    href={`/admin/canciones/${s.id}/editar`}
                    className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground hover:border-primary hover:text-primary"
                  >
                    Editar
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
