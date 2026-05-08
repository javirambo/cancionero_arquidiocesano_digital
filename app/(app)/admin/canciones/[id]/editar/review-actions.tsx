"use client";

import { useEffect, useState } from "react";
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
  canReject: boolean;
  canUnpublish: boolean;
  canArchive: boolean;
  canUnarchive: boolean;
};

function capsFor(status: SongStatus, canReview: boolean): Capabilities {
  const base: Capabilities = {
    canSubmit: false,
    canWithdraw: false,
    canApprove: false,
    canReject: false,
    canUnpublish: false,
    canArchive: false,
    canUnarchive: false,
  };
  if (canReview && status === "review") {
    return { ...base, canWithdraw: true, canApprove: true, canReject: true, canArchive: true };
  }
  if (canReview && status === "published") {
    return { ...base, canUnpublish: true, canArchive: true };
  }
  if (canReview && status === "archived") {
    return { ...base, canUnarchive: true };
  }
  if (status === "draft" || status === "rejected") {
    return {
      ...base,
      canSubmit: true,
      canArchive: canReview,
    };
  }
  if (status === "review") {
    return { ...base, canWithdraw: true };
  }
  return base;
}

export function ReviewActions({
  songId,
  status,
  reviewNotes,
  canReview,
  canDelete,
}: {
  songId: string;
  status: SongStatus;
  reviewNotes: string | null;
  canReview: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const caps = capsFor(status, canReview);

  // Cerrar modal con ESC.
  useEffect(() => {
    if (!showRejectModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRejectModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showRejectModal]);

  function closeRejectModal() {
    setShowRejectModal(false);
    setRejectNotes("");
    setModalError(null);
  }

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
    if (!confirm("¿Enviar esta canción a revisión del editor?")) return;
    await call("submit_song_for_review", { p_song_id: songId });
  }

  async function onWithdraw() {
    const msg = canReview
      ? "¿Devolver esta canción a borrador?"
      : "¿Retirar esta canción de revisión y volverla a borrador?";
    if (!confirm(msg)) return;
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

  async function onConfirmReject() {
    const notes = rejectNotes.trim();
    if (!notes) {
      setModalError("Las notas de rechazo son obligatorias.");
      return;
    }
    setModalError(null);
    const ok = await call("reject_song", { p_song_id: songId, p_notes: notes });
    if (ok) closeRejectModal();
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-sidebar/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Estado:
        </span>
        <SongStatusBadge status={status} />
      </div>

      {status === "rejected" && reviewNotes && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-xs uppercase tracking-wide text-destructive">
            Notas del editor
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm normal-case text-foreground">
            {reviewNotes}
          </p>
        </div>
      )}

      {status === "review" && !canReview && (
        <p className="text-sm normal-case text-muted-foreground">
          La canción está esperando revisión del editor. Mientras tanto, podés
          retirarla para seguir editando.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {caps.canSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="rounded-full border border-secondary bg-secondary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-60"
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
            Aprobar y publicar
          </button>
        )}
        {caps.canReject && (
          <button
            type="button"
            onClick={() => setShowRejectModal(true)}
            disabled={busy}
            className="rounded-full border border-destructive px-5 py-2 text-sm font-semibold uppercase tracking-wide text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
          >
            Rechazar
          </button>
        )}
        {caps.canWithdraw && (
          <button
            type="button"
            onClick={onWithdraw}
            disabled={busy}
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-60"
          >
            {canReview ? "Devolver a borrador" : "Retirar de revisión"}
          </button>
        )}
        {caps.canUnpublish && (
          <button
            type="button"
            onClick={onUnpublish}
            disabled={busy}
            className="rounded-full border border-destructive px-5 py-2 text-sm font-semibold uppercase tracking-wide text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
          >
            Despublicar
          </button>
        )}
        {caps.canArchive && (
          <button
            type="button"
            onClick={onArchive}
            disabled={busy}
            className="rounded-full border border-destructive px-5 py-2 text-sm font-semibold uppercase tracking-wide text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
          >
            Archivar
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
            <span>Borrar</span>
          </button>
        )}
        {caps.canUnarchive && (
          <button
            type="button"
            onClick={onUnarchive}
            disabled={busy}
            className="rounded-full border border-secondary bg-secondary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            Recuperar
          </button>
        )}
      </div>

      {showRejectModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Rechazar canción"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10"
          onClick={closeRejectModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-lg flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-background p-6 shadow-2xl"
          >
            <h2 className="text-xl">Rechazar canción</h2>
            <p className="text-sm normal-case text-muted-foreground">
              Explicá al coordinador qué cambios necesita la canción antes de
              poder publicarse. Estas notas son obligatorias.
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={5}
              autoFocus
              placeholder="Faltan los acordes del estribillo, revisar la tonalidad, etc."
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case"
            />
            {modalError && (
              <p className="text-sm normal-case text-destructive">{modalError}</p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeRejectModal}
                disabled={busy}
                className="rounded-full border border-border px-5 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirmReject}
                disabled={busy || rejectNotes.trim().length === 0}
                className="rounded-full border border-destructive bg-destructive px-5 py-2 text-sm font-semibold uppercase tracking-wide text-destructive-foreground hover:opacity-90 disabled:opacity-60"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
