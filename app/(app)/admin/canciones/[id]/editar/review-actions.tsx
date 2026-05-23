"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast";
import { TrashIcon } from "@/app/components/icons";
import type { SongStatus } from "@/lib/songs-admin";
import { SongStatusBadge } from "../../status-badge";

type Capabilities = {
  canSubmit: boolean;
  canWithdraw: boolean;
  canApprove: boolean;
  canUnpublish: boolean;
  canArchive: boolean;
  canUnarchive: boolean;
};

function capsFor(status: SongStatus, canReview: boolean): Capabilities {
  const base: Capabilities = {
    canSubmit: false,
    canWithdraw: false,
    canApprove: false,
    canUnpublish: false,
    canArchive: false,
    canUnarchive: false,
  };
  if (!canReview) return base;
  if (status === "review") {
    return { ...base, canWithdraw: true, canApprove: true, canArchive: true };
  }
  if (status === "published") {
    return { ...base, canUnpublish: true, canArchive: true };
  }
  if (status === "archived") {
    return { ...base, canUnarchive: true };
  }
  if (status === "draft") {
    return { ...base, canSubmit: true, canArchive: true };
  }
  return base;
}

export function ReviewActions({
  songId,
  status,
  canReview,
  canDelete,
}: {
  songId: string;
  status: SongStatus;
  canReview: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const caps = capsFor(status, canReview);

  async function call(fn: string, args: Record<string, unknown> = {}): Promise<boolean> {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc(fn, args);
    setBusy(false);
    if (error) {
      toast.show(error.message, "error");
      return false;
    }
    router.refresh();
    return true;
  }

  async function onSubmit() {
    if (!confirm("¿Enviar esta canción a revisión?")) return;
    await call("submit_song_for_review", { p_song_id: songId });
  }

  async function onWithdraw() {
    if (!confirm("¿Devolver esta canción a borrador?")) return;
    await call("withdraw_song_from_review", { p_song_id: songId });
  }

  async function onApprove() {
    if (!confirm("¿Aprobar y publicar esta canción?")) return;
    await call("approve_song", { p_song_id: songId });
  }

  async function onUnpublish() {
    if (
      !confirm(
        "¿Despublicar esta canción y volverla a borrador? Dejará de verse públicamente hasta que se vuelva a aprobar."
      )
    )
      return;
    await call("unpublish_song", { p_song_id: songId });
  }

  async function onArchive() {
    if (
      !confirm(
        "¿Archivar esta canción? Dejará de aparecer en búsquedas y vistas públicas. Las playlists que la incluyen la marcarán como no disponible."
      )
    )
      return;
    if (!confirm("Confirmar: archivar esta canción.")) return;
    const ok = await call("archive_song", { p_song_id: songId });
    if (ok) router.push("/admin/canciones");
  }

  async function onDelete() {
    if (
      !confirm(
        "¿Borrar definitivamente esta canción? Solo se permite si nunca salió de borrador. Esta acción no se puede deshacer."
      )
    )
      return;
    if (!confirm("Confirmar: borrar definitivamente esta canción.")) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_draft_song", {
      p_song_id: songId,
    });
    setBusy(false);
    if (error) {
      toast.show(error.message, "error");
      return;
    }
    router.push("/admin/canciones");
  }

  async function onUnarchive() {
    if (
      !confirm(
        "¿Recuperar esta canción? Volverá a borrador y deberá pasar por revisión antes de publicarse nuevamente."
      )
    )
      return;
    await call("unarchive_song", { p_song_id: songId });
  }

  return (
    <section className="rounded-2xl border border-border bg-sidebar">
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <span className="text-sm uppercase tracking-[0.2em] text-primary">
          Estado:
        </span>
        <SongStatusBadge status={status} />
      </div>

      <div className="flex flex-col gap-3 rounded-b-2xl border-t border-border bg-background p-5">
        <div className="flex flex-wrap gap-2">
          {caps.canSubmit && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy}
              className="rounded-full border border-warning bg-warning px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              Enviar a revisión
            </button>
          )}
          {caps.canApprove && (
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              className="rounded-full border border-success bg-success px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              Publicar
            </button>
          )}
          {caps.canWithdraw && (
            <button
              type="button"
              onClick={onWithdraw}
              disabled={busy}
              className="rounded-full border border-info px-5 py-2 text-sm font-semibold uppercase tracking-wide text-info hover:bg-info hover:text-primary-foreground disabled:opacity-60"
            >
              A borrador
            </button>
          )}
          {caps.canUnpublish && (
            <button
              type="button"
              onClick={onUnpublish}
              disabled={busy}
              className="rounded-full border border-info px-5 py-2 text-sm font-semibold uppercase tracking-wide text-info hover:bg-info hover:text-primary-foreground disabled:opacity-60"
            >
              A borrador
            </button>
          )}
          {caps.canArchive && (
            <button
              type="button"
              onClick={onArchive}
              disabled={busy}
              className="rounded-full border border-muted-foreground px-5 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted-foreground hover:text-primary-foreground disabled:opacity-60"
            >
              A papelera
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              aria-label="Borrar definitivamente"
              title="Borrar definitivamente"
              className="inline-flex items-center gap-2 rounded-full border border-destructive px-4 py-2 text-sm font-semibold uppercase tracking-wide text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
            >
              <TrashIcon />
              <span>Eliminar</span>
            </button>
          )}
          {caps.canUnarchive && (
            <button
              type="button"
              onClick={onUnarchive}
              disabled={busy}
              className="rounded-full border border-info px-5 py-2 text-sm font-semibold uppercase tracking-wide text-info hover:bg-info hover:text-primary-foreground disabled:opacity-60"
            >
              A borrador
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
