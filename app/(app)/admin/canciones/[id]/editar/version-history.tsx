"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast";
import { formatearFechaHora } from "@/lib/dates";
import type { SongEvent, SongEventKind, SongVersion } from "@/lib/songs-admin";
import { Accordion } from "./accordion";

type ViewState =
  | { mode: "closed" }
  | { mode: "view"; version: SongVersion }
  | { mode: "compare"; a: SongVersion; b: SongVersion };

const EVENT_LABEL: Record<SongEventKind, string> = {
  created: "Canción creada",
  submitted: "Enviada a revisión",
  withdrawn: "Devuelta a borrador",
  published: "Publicada",
  edited: "Editada (publicada)",
  unpublished: "Despublicada",
  archived: "Archivada",
  unarchived: "Recuperada",
  restored: "Versión restaurada",
};

// Color del punto de la timeline según el tipo de evento.
const EVENT_DOT: Record<SongEventKind, string> = {
  created: "bg-muted-foreground",
  submitted: "bg-secondary",
  withdrawn: "bg-muted-foreground",
  published: "bg-success",
  edited: "bg-success",
  unpublished: "bg-destructive",
  archived: "bg-destructive",
  unarchived: "bg-secondary",
  restored: "bg-primary",
};

function VersionContent({ version }: { version: SongVersion }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-base text-page-title">{version.title}</h3>
        <p className="text-xs normal-case text-muted-foreground">
          {[
            version.original_key ? `Tono: ${version.original_key}` : null,
            version.tempo_bpm ? `${version.tempo_bpm} BPM` : null,
            version.category_names.length > 0
              ? version.category_names.join(", ")
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Sin metadatos"}
        </p>
      </div>
      <pre className="max-h-[50vh] overflow-auto rounded-lg border border-border bg-sidebar/30 p-3 text-sm normal-case whitespace-pre-wrap font-mono">
        {version.body}
      </pre>
    </div>
  );
}

export function VersionHistory({
  songId,
  currentVersion,
  events,
  versions,
}: {
  songId: string;
  currentVersion: number;
  events: SongEvent[];
  versions: SongVersion[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState<ViewState>({ mode: "closed" });
  const [compareWith, setCompareWith] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Índice versión → snapshot, para resolver los modales Ver/Comparar.
  const versionMap = new Map(versions.map((v) => [v.version, v]));

  // Cerrar modal con ESC.
  useEffect(() => {
    if (view.mode === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setView({ mode: "closed" });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view.mode]);

  function startCompare(versionNum: number) {
    if (compareWith === versionNum) {
      setCompareWith(null);
      return;
    }
    if (compareWith === null) {
      setCompareWith(versionNum);
      return;
    }
    const a = versionMap.get(compareWith);
    const b = versionMap.get(versionNum);
    if (!a || !b) {
      setCompareWith(versionNum);
      return;
    }
    const [older, newer] = a.version < b.version ? [a, b] : [b, a];
    setView({ mode: "compare", a: older, b: newer });
    setCompareWith(null);
  }

  async function onRestore(versionNum: number) {
    if (
      !confirm(
        `¿Restaurar la versión ${versionNum}? Su contenido reemplazará el de la canción actual. La canción no cambia de estado; podés revisar y guardar después.`
      )
    )
      return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("restore_song_version", {
      p_song_id: songId,
      p_version: versionNum,
    });
    setBusy(false);
    if (error) {
      toast.show(error.message, "error");
      return;
    }
    toast.show(`Versión ${versionNum} restaurada.`);
    router.refresh();
  }

  return (
    <Accordion
      title={`Historial de versiones${
        events.length > 0 ? ` (${events.length})` : ""
      }`}
      defaultOpen={false}
    >
      {events.length === 0 ? (
        <p className="text-sm normal-case text-muted-foreground">
          Esta canción todavía no tiene eventos registrados.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {compareWith !== null && (
            <p className="text-xs normal-case text-secondary">
              Versión {compareWith} seleccionada. Elegí otra versión para
              comparar.
            </p>
          )}
          <ol className="flex flex-col">
            {events.map((ev, idx) => {
              const snapshot =
                ev.version !== null ? versionMap.get(ev.version) : undefined;
              const isLast = idx === events.length - 1;
              return (
                <li key={ev.id} className="flex gap-3">
                  {/* Columna de la timeline: punto + línea vertical. */}
                  <div className="flex flex-col items-center">
                    <span
                      aria-hidden
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        EVENT_DOT[ev.event]
                      }`}
                    />
                    {!isLast && (
                      <span
                        aria-hidden
                        className="w-px flex-1 bg-border"
                      />
                    )}
                  </div>
                  {/* Contenido del evento. */}
                  <div
                    className={`flex flex-1 flex-wrap items-start justify-between gap-3 ${
                      isLast ? "" : "pb-4"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold normal-case text-foreground">
                        {EVENT_LABEL[ev.event]}
                        {ev.version !== null ? ` · v${ev.version}` : ""}
                        {ev.version !== null &&
                          ev.version === currentVersion && (
                            <span className="ml-1 font-normal normal-case text-secondary">
                              (actual)
                            </span>
                          )}
                      </span>
                      <span className="text-xs normal-case text-muted-foreground">
                        {formatearFechaHora(ev.created_at)}
                        {ev.actor_name ? ` · ${ev.actor_name}` : ""}
                      </span>
                      {ev.summary && (
                        <span className="text-xs normal-case text-muted-foreground">
                          {ev.summary}
                        </span>
                      )}
                    </div>
                    {snapshot && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setView({ mode: "view", version: snapshot })
                          }
                          className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => startCompare(snapshot.version)}
                          className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                            compareWith === snapshot.version
                              ? "border-secondary bg-secondary text-primary-foreground"
                              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                          }`}
                        >
                          {compareWith === snapshot.version
                            ? "Cancelar"
                            : "Comparar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRestore(snapshot.version)}
                          disabled={busy}
                          className="rounded-full border border-primary px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
                        >
                          Restaurar
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {view.mode !== "closed" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            view.mode === "view"
              ? `Versión ${view.version.version}`
              : `Comparar versiones ${view.a.version} y ${view.b.version}`
          }
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10"
          onClick={() => setView({ mode: "closed" })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-4xl flex-col gap-4 overflow-auto rounded-2xl border border-border bg-background p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg text-page-title">
                {view.mode === "view"
                  ? `Versión ${view.version.version}`
                  : `Comparar v${view.a.version} → v${view.b.version}`}
              </h2>
              <button
                type="button"
                onClick={() => setView({ mode: "closed" })}
                className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
              >
                Cerrar
              </button>
            </div>

            {view.mode === "view" ? (
              <VersionContent version={view.version} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Versión {view.a.version}
                  </span>
                  <VersionContent version={view.a} />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Versión {view.b.version}
                  </span>
                  <VersionContent version={view.b} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Accordion>
  );
}
