"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast";

type Props = {
  id: string;
  name: string;
};

export function PlaylistRowActions({ id, name }: Props) {
  const router = useRouter();
  const { show: showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (busy) return;
    const ok = window.confirm(
      `¿Eliminar la playlist "${name}"? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("playlists").delete().eq("id", id);
    if (error) {
      showToast(`No se pudo eliminar: ${error.message}`, "error");
      setBusy(false);
      return;
    }
    showToast(`Playlist "${name}" eliminada.`);
    router.refresh();
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Link
        href={`/playlists/${id}`}
        className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide text-foreground hover:border-primary hover:text-primary"
      >
        Ver
      </Link>
      <Link
        href={`/playlists/${id}/editar`}
        className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide text-foreground hover:border-primary hover:text-primary"
      >
        Editar
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="rounded-full border border-destructive px-3 py-1 text-xs uppercase tracking-wide text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
      >
        Eliminar
      </button>
    </div>
  );
}
