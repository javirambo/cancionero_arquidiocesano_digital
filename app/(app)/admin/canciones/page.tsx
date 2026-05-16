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
import { SongStatusBadge } from "./status-badge";
import { SearchForm } from "./search-form";

type EstadoTab = SongStatus | "todas";

const TABS: { value: EstadoTab; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "draft", label: "Borradores" },
  { value: "review", label: "En revisión" },
  { value: "published", label: "Publicados" },
  { value: "rejected", label: "Rechazados" },
  { value: "archived", label: "Archivados" },
];

function isEstadoTab(v: string | undefined): v is EstadoTab {
  return TABS.some((t) => t.value === v);
}

export default async function AdminCancionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");

  const sp = await searchParams;
  const q = sp.q ?? "";
  const estado: EstadoTab = isEstadoTab(sp.estado) ? sp.estado : "todas";
  const songs = await listSongsForAdmin(q, estado);

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl text-page-title">Cantos</h1>
          <Link
            href="/admin/canciones/nueva"
            className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
          >
            + Nuevo
          </Link>
        </div>
        <p className="text-sm normal-case text-muted-foreground">
          Edición de metadatos, letra/acordes y archivos. Flujo editorial draft → revisión → publicado.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Filtrar por estado">
        {TABS.map((t) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (t.value !== "todas") params.set("estado", t.value);
          const href = `/admin/canciones${params.toString() ? `?${params.toString()}` : ""}`;
          const active = t.value === estado;
          return (
            <Link
              key={t.value}
              href={href}
              className={
                active
                  ? "rounded-full border border-primary bg-primary px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary-foreground"
                  : "rounded-full border border-border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
              }
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <SearchForm defaultValue={q} estado={estado} />

      {songs.length === 0 ? (
        <p className="text-sm normal-case text-muted-foreground">
          No hay canciones que mostrar.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-background">
          {songs.map((s) => {
            const titleLine =
              s.number !== null ? `${s.number} · ${s.title}` : s.title;
            const line2LeftParts: string[] = [];
            if (s.category) line2LeftParts.push(s.category);
            if (s.author) line2LeftParts.push(s.author);
            return (
              <li
                key={s.id}
                className="group flex items-center gap-3 py-3 pl-3 pr-5 transition-colors hover:bg-sidebar"
              >
                <Link
                  href={`/admin/canciones/${s.id}/editar`}
                  className="flex min-w-0 flex-1 flex-col gap-0.5"
                  prefetch={false}
                >
                  <span className="truncate text-lg text-song-title">
                    {titleLine}
                  </span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {line2LeftParts.length > 0 && (
                        <span className="truncate text-xs normal-case">
                          {line2LeftParts.join(" · ")}
                        </span>
                      )}
                      <span className="flex shrink-0 items-center gap-2">
                        {s.hasChords && (
                          <span title="Tiene acordes">
                            <ChordsIcon />
                          </span>
                        )}
                        {s.hasYoutube && (
                          <span title="Tiene video de YouTube">
                            <PlayIcon />
                          </span>
                        )}
                        {s.hasFiles && (
                          <span title="Tiene partitura o archivos">
                            <FilesIcon />
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-xs normal-case text-muted-foreground">
                      <span className="truncate">
                        Modificada {formatearFecha(s.updated_at)}
                      </span>
                      <SongStatusBadge status={s.status} size="sm" />
                    </span>
                </Link>
                <Link
                  href={`/admin/canciones/${s.id}/editar`}
                  aria-label={`Editar ${s.title}`}
                  title="Editar"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:border-border hover:text-primary"
                >
                  <EditIcon />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
